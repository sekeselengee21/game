import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { setAuthenticated } from "../providers/auth-slice";
import type { GameTable } from "./admin";
const baseURL = import.meta.env.VITE_BACKEND_URL;

interface DataBlock {
  name: string;
  value: string;
}

interface User {
  userId: number;
  email: string;
  isVerified: boolean;
  username: string;
  profileUrl: string;
  role: string;
  bankName: string;
  accountNumber: string;
  password: string;
  userBalance: {
    balance: number;
    lockedAmount: number;
    bonusBalance: number;
  };
  avatar: string;
  cgpScore: number;
}

interface LoginCredentials {
  username: string;
  password: string;
}

interface Outcome {
  outcomeId: number;
  user: User;
  amount: number;
  type: string;
  gameSessionId: number;
  createDate: string;
  accountDate: string | null;
  accounted: boolean;
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: `${baseURL}/api/v1/user`,
  prepareHeaders: (headers) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
  credentials: "include",
});

const baseQuery: typeof rawBaseQuery = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result?.error?.status === 401) {
    api.dispatch(setAuthenticated(false));
  }

  return result;
};

export const userApi = createApi({
  reducerPath: "userApi",
  baseQuery: baseQuery,
  tagTypes: [
    "DataBlock",
    "UserList",
    "tables",
    "DepositList",
    "WithdrawList",
    "OutcomeList",
    "Me",
  ],
  keepUnusedDataFor: 300, // Cache data for 5 minutes
  refetchOnMountOrArgChange: false, // Don't refetch on component mount
  refetchOnFocus: false, // Don't refetch when window gains focus
  refetchOnReconnect: true, // Don't refetch on network reconnect
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials: LoginCredentials) => ({
        url: "/login",
        method: "POST",
        body: credentials,
      }),
    }),
    register: builder.mutation({
      query: (userData: User) => ({
        url: "/register",
        method: "POST",
        body: userData,
      }),
    }),
    me: builder.query<User, void>({
      query: () => ({
        url: "/me",
        method: "GET",
      }),

      providesTags: ["Me"],
    }),
    updateMe: builder.mutation({
      query: (userData: User) => ({
        url: "/me",
        method: "PATCH",
        body: userData,
      }),
      invalidatesTags: ["UserList", "Me"],
    }),
    searchUsers: builder.query<User[], void>({
      query: () => ({
        url: "/search",
        method: "GET",
      }),
      providesTags: ["UserList"],
    }),
    fetchTables: builder.query<GameTable[], void>({
      query: () => ({
        url: "/tables",
        method: "GET",
      }),
      providesTags: ["tables"],
    }),
    fetchTableById: builder.query<GameTable, number>({
      query: (id: number) => ({
        url: `/tables/${id}`,
        method: "GET",
      }),
      providesTags: ["tables"],
    }),
    fetchTableBySecureId: builder.query<GameTable, string>({
      query: (secureId: string) => ({
        url: `/tables/${secureId}`,
        method: "GET",
      }),
      providesTags: ["tables"],
    }),

    fetchDeposits: builder.query<any, void>({
      query: () => ({
        url: "/deposit",
        method: "GET",
      }),
      providesTags: ["DepositList"],
    }),
    fetchWithdrawals: builder.query<any, void>({
      query: () => ({
        url: "/withdrawal",
        method: "GET",
      }),
      providesTags: ["WithdrawList"],
    }),
    createWithdrawal: builder.mutation({
      query: (withdrawalData: { amount: number; details: any }) => ({
        url: "/withdrawal",
        method: "POST",
        body: withdrawalData,
      }),
      invalidatesTags: ["WithdrawList", "Me"],
    }),
    fetchOutcomes: builder.query<Outcome[], void>({
      query: () => ({
        url: "/outcome",
        method: "GET",
      }),
      providesTags: ["OutcomeList"],
    }),
    fetchMaintenance: builder.query<
      {
        item1: string; // ISO date string
        item2: string; // ISO date string
      },
      void
    >({
      query: () => ({
        url: "/maintenance",
        method: "GET",
      }),
      providesTags: ["Me"],
    }),
    fetchDataBlockByName: builder.query<DataBlock, string>({
      query: (name: string) => ({
        url: `/block/${name}`,
        method: "GET",
      }),
      providesTags: ["DataBlock"],
    }),
    updateAvatar: builder.mutation({
      query: (data: {
        avatar: string | null;
        avatarBorder: string | null;
      }) => ({
        url: "/avatar",
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Me"],
    }),
    createDeposit: builder.mutation<
      void,
      { userId: number; amount: number; type: string; details: object }
    >({
      query: (data) => ({
        url: "/deposit",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["DepositList", "Me"],
    }),
    claimBonus: builder.mutation<User["userBalance"], void>({
      query: () => ({
        url: "/bonus/claim",
        method: "POST",
      }),
      invalidatesTags: ["Me"],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useMeQuery,
  useUpdateMeMutation,
  useFetchTablesQuery,
  useSearchUsersQuery,
  useFetchDepositsQuery,
  useFetchWithdrawalsQuery,
  useCreateWithdrawalMutation,
  useFetchOutcomesQuery,
  useFetchMaintenanceQuery,
  useFetchDataBlockByNameQuery,
  useLazyMeQuery,
  useFetchTableByIdQuery,
  useUpdateAvatarMutation,
  useCreateDepositMutation,
  useFetchTableBySecureIdQuery,
  useClaimBonusMutation,
} = userApi;
export type { User, LoginCredentials, DataBlock };
