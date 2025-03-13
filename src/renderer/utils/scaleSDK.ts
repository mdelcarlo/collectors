import { fetchApi } from "./fetchApi";

export async function getUser(config: RequestInit) {
  return fetchApi('/internal/logged_in_user', {
    ...{ config },
    method: 'GET',
  });
}

export async function getUnleashFeature({ feature, projectId, customerId }: {
  feature: string
  projectId?: string | null
  customerId?: string | null
}) {
  return fetchApi(`/internal/anteater-dashboard/unleash-flag/${feature}`, {
    method: 'POST',
    body: JSON.stringify({ customerId, projectId }),
  });
}