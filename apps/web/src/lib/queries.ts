import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PatchTestimonial, Testimonial } from "@reviewloop/shared";
import { api, keys } from "./api";

export function useSpace() {
  return useQuery({ queryKey: keys.space, queryFn: api.space });
}

export function useTestimonials() {
  return useQuery({
    queryKey: keys.testimonials,
    queryFn: api.testimonials,
    // While anything is being scored, poll so the AI panel fills in by itself.
    refetchInterval: (q) => (q.state.data?.some((t) => t.ai.state === "queued") ? 1500 : false),
  });
}

export function useAnalytics() {
  return useQuery({ queryKey: keys.analytics, queryFn: api.analytics });
}

export function useWebhooks() {
  return useQuery({ queryKey: keys.webhooks, queryFn: api.webhooks });
}

/** Applies a patch to the cached list the same way the API applies it. */
function applyPatch(list: Testimonial[], id: string, patch: PatchTestimonial): Testimonial[] {
  return list.map((t) => {
    if (t.id === id) {
      const status = patch.status ?? t.status;
      return { ...t, status, featured: status === "approved" ? (patch.featured ?? t.featured) : false };
    }
    // One featured testimonial per space.
    return patch.featured ? { ...t, featured: false } : t;
  });
}

/**
 * Optimistic moderation: the queue and the widget preview change on click,
 * and roll back if the API says no.
 */
export function useModerate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: PatchTestimonial }) => api.patch(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: keys.testimonials });
      const previous = qc.getQueryData<Testimonial[]>(keys.testimonials);
      if (previous) qc.setQueryData(keys.testimonials, applyPatch(previous, id, patch));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(keys.testimonials, ctx.previous);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.testimonials });
      void qc.invalidateQueries({ queryKey: keys.space });
    },
  });
}

export function useRescore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.rescore,
    onSuccess: (updated) =>
      qc.setQueryData<Testimonial[]>(keys.testimonials, (list) =>
        list?.map((t) => (t.id === updated.id ? updated : t)),
      ),
  });
}

export function useResetDemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.reset,
    onSuccess: () => qc.invalidateQueries(),
  });
}
