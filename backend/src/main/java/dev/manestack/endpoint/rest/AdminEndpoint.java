package dev.manestack.endpoint.rest;

import dev.manestack.endpoint.ws.GlobalSocket;
import dev.manestack.service.ChatService;
import dev.manestack.service.GameService;
import dev.manestack.service.UserService;
import dev.manestack.service.poker.table.GameSessionSnapshot;
import dev.manestack.service.poker.table.GameTable;
import dev.manestack.service.user.DataBlock;
import dev.manestack.service.user.Deposit;
import dev.manestack.service.user.User;
import dev.manestack.service.user.Withdrawal;
import io.quarkus.security.identity.CurrentIdentityAssociation;
import io.smallrye.mutiny.Uni;
import io.vertx.core.json.JsonObject;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Response;
import dev.manestack.dto.RoleUpdateRequest;


import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@RolesAllowed({"ADMIN"})
@Path("/api/v1/admin")
public class AdminEndpoint {
    @Inject
    CurrentIdentityAssociation identity;
    @Inject
    UserService userService;
    @Inject
    GameService gameService;
    @Inject
    ChatService chatService;

    @GET
    @Path("/user/search")
    public Uni<List<User>> searchUsers(@QueryParam("username") @DefaultValue("") String username) {
        return userService.searchUsers(username, true);
    }

    @DELETE
    @Path("/user")
    public Uni<Void> deleteUser(@QueryParam("userId") Integer userId) {
        return identity.getDeferredIdentity()
                .chain(identity -> userService.deleteUser(userId, Integer.parseInt(identity.getPrincipal().getName())));
    }

    @GET
    @Path("/deposit")
    public Uni<List<Deposit>> fetchDeposits(@QueryParam("userId") Integer userId) {
        return identity.getDeferredIdentity()
                .chain(identity -> userService.fetchDeposits(userId));
    }

    @POST
    @Path("/deposit")
    public Uni<Deposit> createDeposit(Deposit deposit) {
        return identity.getDeferredIdentity()
                .chain(identity -> userService.createDeposit(Integer.parseInt(identity.getPrincipal().getName()), deposit));
    }

    @PUT
    @Path("/deposit/approve")
    public Uni<Deposit> approveDeposit(@QueryParam("depositId") Long depositId) {
        return identity.getDeferredIdentity()
                .chain(identity -> {
                    Integer adminId = Integer.parseInt(identity.getPrincipal().getName());
                    return userService.approveDeposit(adminId, depositId);
                });
    }

    @PUT
    @Path("/deposit/deny")
    public Uni<Deposit> denyDeposit(
            @QueryParam("depositId") Long depositId,
            JsonObject payload
    ) {
        return identity.getDeferredIdentity()
                .chain(identity -> {
                    Integer adminId = Integer.parseInt(identity.getPrincipal().getName());
                    String deniedReason = payload != null ? payload.getString("deniedReason") : null;
                    return userService.denyDeposit(adminId, depositId, deniedReason);
                });
    }

    @GET
    @Path("/withdrawal")
    public Uni<List<Withdrawal>> fetchWithdrawals(@QueryParam("userId") Integer userId) {
        return identity.getDeferredIdentity()
                .chain(identity -> userService.fetchWithdrawals(userId));
    }

    @PUT
    @Path("/withdrawal/approve")
    public Uni<Withdrawal> approveWithdrawal(@QueryParam("withdrawalId") Long withdrawalId) {
        return identity.getDeferredIdentity()
                .chain(identity -> userService.approveWithdrawal(Integer.parseInt(identity.getPrincipal().getName()), withdrawalId));
    }

    @GET
    @Path("/table")
    public Uni<Collection<GameTable>> fetchTables() {
        return identity.getDeferredIdentity()
                .chain(identity -> gameService.fetchTables());
    }

    @POST
    @Path("/table")
    public Uni<GameTable> createTable(GameTable gameTable) {
        return identity.getDeferredIdentity()
                .chain(identity -> gameService.createTable(Integer.parseInt(identity.getPrincipal().getName()), gameTable));
    }

    @PATCH
    @Path("/table")
    public Uni<GameTable> updateTable(GameTable gameTable) {
        return identity.getDeferredIdentity()
                .chain(identity -> gameService.updateTable(gameTable));
    }

    @DELETE
    @Path("/table")
    public Uni<Void> deleteTable(@QueryParam("tableId") Long tableId) {
        return identity.getDeferredIdentity()
                .chain(identity -> gameService.deleteTable(tableId, Integer.parseInt(identity.getPrincipal().getName())));
    }

    @GET
    @Path("/table/session")
    public Uni<List<GameSessionSnapshot>> fetchSnapshotsByTableId(@QueryParam("tableId") Integer tableId) {
        return identity.getDeferredIdentity()
                .chain(identity -> gameService.fetchGameSessionSnapshots(tableId));
    }

    @POST
    @Path("/maintenance")
    public Uni<Void> scheduleMaintenance(JsonObject jsonObject) {
        String startDate = jsonObject.getString("startDate");
        String endDate = jsonObject.getString("endDate");
        if (startDate == null || endDate == null) {
            return Uni.createFrom().failure(new IllegalArgumentException("Start date and end date must be provided"));
        }
        LocalDateTime start = LocalDateTime.parse(startDate);
        LocalDateTime end = LocalDateTime.parse(endDate);
        return identity.getDeferredIdentity()
                .chain(identity -> gameService.scheduleMaintenanceSchedule(Integer.parseInt(identity.getPrincipal().getName()), start, end));
    }


    @DELETE
    @Path("/table/kick")
    public Uni<Response> kickPlayer(@QueryParam("tableId") Long tableId, @QueryParam("userId") Integer userId) {
        return identity.getDeferredIdentity()
                .chain(() -> gameService.kickPlayerFromTable(tableId, userId))
                .onItem().transform(result -> Response.ok().build())
                .onFailure().recoverWithItem(Response.status(Response.Status.INTERNAL_SERVER_ERROR).build());
    }

    @GET
    @Path("/block/list")
    public Uni<Response> fetchDataBlocks() {
        return identity.getDeferredIdentity()
                .chain(() -> userService.fetchDataBlocks())
                .onItem().transform(result -> Response.ok(result).build())
                .onFailure().recoverWithItem(Response.status(Response.Status.INTERNAL_SERVER_ERROR).build());
    }


    @POST
    @Path("/block")
    public Uni<Response> createDataBlocks(DataBlock dataBlock) {
        return identity.getDeferredIdentity()
                .chain(() -> userService.createDataBlock(dataBlock))
                .onItem().transform(result -> Response.ok(result).build())
                .onFailure().recoverWithItem(Response.status(Response.Status.INTERNAL_SERVER_ERROR).build());
    }

    @PUT
    @Path("/block/{name}")
    public Uni<Response> updateDataBlock(@PathParam("name") String blockName, DataBlock dataBlock) {
        return identity.getDeferredIdentity()
                .chain(() -> userService.updateDataBlock(blockName, dataBlock))
                .onItem().transform(result -> Response.ok(result).build())
                .onFailure().recoverWithItem(Response.status(Response.Status.INTERNAL_SERVER_ERROR).build());
    }
    @DELETE
    @Path("/block/{name}")
    public Uni<Response> deleteDataBlock(@PathParam("name") String blockName) {
        return identity.getDeferredIdentity()
            .chain(() -> userService.deleteDataBlock(blockName))
            .onItem().transform(result -> Response.ok().build())
            .onFailure().recoverWithItem(err -> {
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Failed to delete data block: " + err.getMessage())
                    .build();
            });
    }
    @PATCH
    @Path("/user/role")
    @Transactional
    public Uni<Response> updateUserRole(@QueryParam("userId") Integer userId, RoleUpdateRequest request) {
        if (request == null || request.role == null) {
            return Uni.createFrom().item(Response.status(Response.Status.BAD_REQUEST).entity("Role is required").build());
        }

        return identity.getDeferredIdentity().chain(identity -> {
            return userService.updateUserRole(userId, request.role.toUpperCase())
                .onItem().transform(unused -> Response.ok().build())
                .onFailure().recoverWithItem(Response.status(Response.Status.INTERNAL_SERVER_ERROR).build());
        });
    }   

    @POST
    @Path("/broadcast")
    public Uni<Response> broadcastMessage(JsonObject payload) {
        String message = payload != null ? payload.getString("message") : null;
        if (message == null || message.isBlank()) {
            return Uni.createFrom().item(Response.status(Response.Status.BAD_REQUEST).entity("message is required").build());
        }
        // broadcastSystemMessage is non-blocking (uses sendText + subscribe), safe on the event loop.
        GlobalSocket.broadcastSystemMessage(message);
        return Uni.createFrom().item(Response.ok().build());
    }

    @PATCH
    @Path("/user/balance")
    @Transactional
    public Uni<Response> updateUserBalance(
            @QueryParam("userId") Integer userId,
            @QueryParam("amount") Double newBalance,
            @QueryParam("bonus") Integer newBonus 
    ) {
        if (userId == null || newBalance == null) {
            return Uni.createFrom()
                    .item(Response.status(Response.Status.BAD_REQUEST)
                            .entity("userId and amount are required")
                            .build());
        }

        return identity.getDeferredIdentity()
                .chain(id -> {
                    if (newBonus == null) {
                        return userService.fetchUserBalance(userId)
                                .chain(userBalance -> userService.updateUserBalance(
                                        userId,
                                        newBalance.intValue(),
                                        userBalance.getBonusBalance() != null ? userBalance.getBonusBalance() : 0
                                ));
                    } else {
                        return userService.updateUserBalance(userId, newBalance.intValue(), newBonus);
                    }
                })
                .onItem().transform(unused -> Response.ok().build())
                .onFailure().recoverWithItem(
                        Response.status(Response.Status.INTERNAL_SERVER_ERROR).build()
                );
    }

    @DELETE
    @Path("/chat")
    public Uni<Response> deleteAllChatMessages() {
        return identity.getDeferredIdentity().chain(id -> {
            chatService.deleteAllMessages();
            return Uni.createFrom().item(Response.noContent().build());
        });
    }

}
