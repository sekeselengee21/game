import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { HandHistory } from "../api/game";

const baseURL = import.meta.env.VITE_BACKEND_URL;

export const tablesApi = createApi({
  reducerPath: "tablesApi",
  baseQuery: fetchBaseQuery({
    baseUrl: baseURL,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem("accessToken");
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["HandHistory"],
  keepUnusedDataFor: 300,
  refetchOnMountOrArgChange: false,
  refetchOnFocus: false,
  refetchOnReconnect: false,
  endpoints: (builder) => ({
    fetchHandHistory: builder.query<HandHistory[], { tableId: number; limit?: number; offset?: number }>({
      query: ({ tableId, limit = 10, offset = 0 }) => `/tables/${tableId}/hand-history?limit=${limit}&offset=${offset}`,
      providesTags: ["HandHistory"],
    }),
  }),
});

export const { useFetchHandHistoryQuery } = tablesApi;
