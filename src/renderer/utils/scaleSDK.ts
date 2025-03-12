import { fetchApi } from "./fetchApi";

export async function getUser(config: RequestInit) {
    return fetchApi('/internal/logged_in_user', {
      ...{config},
      method: 'GET',
    });
  }