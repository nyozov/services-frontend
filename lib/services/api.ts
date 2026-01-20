const API_URL = process.env.NEXT_PUBLIC_API_URL

const getHeaders = async (token?: string | null) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// Stores
export const storesApi = {
  getAll: async (token: string) => {
    const response = await fetch(`${API_URL}/stores`, {
      headers: await getHeaders(token),
    });
    if (!response.ok) throw new Error('Failed to fetch stores');
    return response.json();
  },

  getBySlug: async (slug: string) => {
    const response = await fetch(`${API_URL}/stores/${slug}`);
    if (!response.ok) throw new Error('Store not found');
    return response.json();
  },

  create: async (token: string, data: { name: string; description?: string }) => {
    const response = await fetch(`${API_URL}/stores`, {
      method: 'POST',
      headers: await getHeaders(token),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create store');
    return response.json();
  },
};

export const itemsApi = {
  getByStoreId: async (token: string, storeId: string) => {
    const response = await fetch(`${API_URL}/items/store/${storeId}`, {
      headers: await getHeaders(token),
    });
    if (!response.ok) throw new Error('Failed to fetch items');
    return response.json();
  },

  create: async (
    token: string,
    data: {
      storeId: string;
      name: string;
      description?: string;
      price: number;
      imageUrl?: string;
    }
  ) => {
    const response = await fetch(`${API_URL}/items`, {
      method: 'POST',
      headers: await getHeaders(token),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create item');
    return response.json();
  },
};

export const usersApi = {
  sync: async (data: { clerkUserId: string; email: string; name?: string }) => {
    const response = await fetch(`${API_URL}/users/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to sync user');
    return response.json();
  },
};
