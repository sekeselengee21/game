import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { setAuthenticated } from "../providers/auth-slice";
import type { DataBlock, User } from "./user";
import type { GamePlayer } from "./game";

const baseURL = import.meta.env.VITE_BACKEND_URL;

interface Withdrawal {
  withdrawalId: number;
  userId: number;
  amount: number;
  createDate: string;
  approvedBy: number;
  approveDate: string;
  details: object;
  user: User;
}

interface Deposit {
  depositId: number;
  userId: number;
  amount: number;
  createDate: string;
  adminId?: number;
  approvedDate?: string;
  approvedBy?: number;
  approveDate?: string;
  details: object;
  user: User;
  status?: "PENDING" | "APPROVED" | "DENIED";
  deniedReason?: string;
}

interface GameTable {
  tableId: number;
  tableName: string;
  maxPlayers: number;
  bigBlind: number;
  smallBlind: number;
  minBuyIn: number;
  maxBuyIn: number;
  gameVariant: string;
  createdAt: string;
  createdBy: number;
  seats?: Record<number, GamePlayer>;
  secureTableId: string;
  rakePercent?: number;
  activePlayers: number;
  playersInTable: number;
  secureId: string;
}

interface GameSessionSnapshot {
  sessionId: string;
  tableId: number;
  details: any;
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: `${baseURL}/api/v1/admin`,
  prepareHeaders: (headers) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQuery: typeof rawBaseQuery = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result?.error?.status === 401) {
    api.dispatch(setAuthenticated(false));
  }

  return result;
};

export const adminApi = createApi({
  reducerPath: "adminApi",
  baseQuery: baseQuery,
  tagTypes: ["withdrawals", "deposits", "tables", "gameSessions", "DataBlocks", "users"],
  keepUnusedDataFor: 300, // Cache data for 5 minutes
  refetchOnMountOrArgChange: false,
  refetchOnFocus: false,
  refetchOnReconnect: false,
  endpoints: (builder) => ({
    fetchWithdrawals: builder.query<Withdrawal[], void>({
      query: () => ({
        url: "/withdrawal",
        method: "GET",
      }),
      providesTags: ["withdrawals"],
    }),
    fetchDeposits: builder.query<Deposit[], void>({
      query: () => ({
        url: "/deposit",
        method: "GET",
      }),
      providesTags: ["deposits"],
    }),
    createDeposit: builder.mutation<void, { userId: number; amount: number; type: string; details: object }>({
      query: (data) => ({
        url: "/deposit",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["deposits"],
    }),
    deleteUser: builder.mutation<void, number>({
      query: (id) => ({
        url: `/user?userId=${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["withdrawals", "deposits", "users"],
    }),
    kickPlayer: builder.mutation<void, { tableId: number; userId: number }>({
      query: ({ tableId, userId }) => ({
        url: `/table/kick?tableId=${tableId}&userId=${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["tables"],
    }),
    approveWithdrawal: builder.mutation<void, { id: number }>({
      query: ({ id }) => ({
        url: `/withdrawal/approve?withdrawalId=${id}`,
        method: "PUT",
      }),
      invalidatesTags: ["withdrawals"],
    }),
    approveDeposit: builder.mutation<void, { id: number }>({
      query: ({ id }) => ({
        url: `/deposit/approve?depositId=${id}`,
        method: "PUT",
      }),
      invalidatesTags: ["deposits", "users"],
    }),
    denyDeposit: builder.mutation<void, { id: number; deniedReason?: string }>({
      query: ({ id, deniedReason }) => ({
        url: `/deposit/deny?depositId=${id}`,
        method: "PUT",
        body: deniedReason ? { deniedReason } : {},
      }),
      invalidatesTags: ["deposits"],
    }),
    adminSearchUsers: builder.query<User[], void>({
      query: () => ({
        url: "/user/search",
        method: "GET",
      }),
      providesTags: ["users"],
    }),
    updateUserRole: builder.mutation<void, { userId: number; role: "ADMIN" | "USER" }>({
      query: ({ userId, role }) => ({
        url: `/user/role?userId=${userId}`,
        method: "PATCH",
        body: { role },
      }),
      invalidatesTags: ["users"],
    }),
    createTable: builder.mutation<void, GameTable>({
      query: (data) => ({
        url: "/table",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["tables"],
    }),
    updateTable: builder.mutation<void, GameTable>({
      query: (data) => ({
        url: `/table`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["tables"],
    }),
    deleteTable: builder.mutation<void, number>({
      query: (id) => ({
        url: `/table?tableId=${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["tables"],
    }),
    fetchGameSessions: builder.query<GameSessionSnapshot[], { tableId: number }>({
      query: (data) => ({
        url: `/table/session?tableId=${data.tableId}`,
        method: "GET",
      }),
      providesTags: ["gameSessions"],
    }),
    fetchDataBlocks: builder.query<DataBlock[], void>({
      query: () => ({
        url: "/block/list",
        method: "GET",
      }),
      providesTags: ["DataBlocks"],
    }),
    createDataBlock: builder.mutation<void, DataBlock>({
      query: (block) => ({
        url: "/block",
        method: "POST",
        body: block,
      }),
      invalidatesTags: ["DataBlocks"],
    }),
    updateDataBlock: builder.mutation<void, { name: string; block: DataBlock }>({
      query: ({ name, block }) => ({
        url: `/block/${name}`,
        method: "PUT",
        body: block,
      }),
      invalidatesTags: ["DataBlocks"],
    }),
    deleteDataBlock: builder.mutation<void, string>({
      query: (name) => ({
        url: `/block/${name}`,
        method: "DELETE",
      }),
      invalidatesTags: ["DataBlocks"],
    }),

    startSimulation: builder.mutation<void, { tableId: number }>({
      query: ({ tableId }) => ({
        url: `/table/simulate?tableId=${tableId}`,
        method: "PUT",
        responseHandler: async (res) => {
          await res.text();
        },
      }),
      invalidatesTags: ["tables"],
    }),

    stopSimulation: builder.mutation<void, { tableId: number }>({
      query: ({ tableId }) => ({
        url: `/table/simulate?tableId=${tableId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["tables"],
    }),
    updateUserBalance: builder.mutation<void, { userId: number; balance: number }>({
      query: ({ userId, balance }) => ({
        url: `/user/balance?userId=${userId}&amount=${balance}`,
        method: "PATCH",
      }),
      invalidatesTags: ["users"],
    }),
    sendBroadcastMessage: builder.mutation<void, { message: string }>({
      query: (data) => ({
        url: "/broadcast",
        method: "POST",
        body: data,
      }),
    }),
    deleteChatHistory: builder.mutation<void, void>({
      query: () => ({
        url: "/chat",
        method: "DELETE",
      }),
    }),
  }),
});

export const {
  useFetchWithdrawalsQuery,
  useFetchDepositsQuery,
  useApproveWithdrawalMutation,
  useApproveDepositMutation,
  useDenyDepositMutation,
  useCreateDepositMutation,
  useAdminSearchUsersQuery,
  useCreateTableMutation,
  useUpdateTableMutation,
  useDeleteTableMutation,
  useFetchGameSessionsQuery,
  useDeleteUserMutation,
  useKickPlayerMutation,
  useFetchDataBlocksQuery,
  useCreateDataBlockMutation,
  useUpdateDataBlockMutation,
  useDeleteDataBlockMutation,
  useStartSimulationMutation,
  useStopSimulationMutation,
  useUpdateUserRoleMutation,
  useUpdateUserBalanceMutation,
  useSendBroadcastMessageMutation,
  useDeleteChatHistoryMutation,
} = adminApi;

export type { Withdrawal, Deposit, GameTable };
