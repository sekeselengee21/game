package dev.manestack.endpoint.rest;

import dev.manestack.service.GameService;
import dev.manestack.service.UserService;
import dev.manestack.service.poker.table.GameTable;
import dev.manestack.service.user.Deposit;
import dev.manestack.service.user.Outcome;
import dev.manestack.service.user.User;
import dev.manestack.service.user.UserBalance;
import dev.manestack.service.user.Withdrawal;
import io.quarkus.security.Authenticated;
import io.quarkus.security.identity.CurrentIdentityAssociation;
import io.smallrye.mutiny.Uni;
import io.smallrye.mutiny.tuples.Tuple2;
import io.vertx.core.json.JsonObject;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Response;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Path("/api/v1/user")
public class UserEndpoint {
    @Inject
    CurrentIdentityAssociation identity;
    @Inject
    UserService userService;
    @Inject
    GameService gameService;

  @POST
    @Path("/login")
    public Uni<JsonObject> loginUser(JsonObject jsonObject) {
        String username = jsonObject.getString("username");
        String password = jsonObject.getString("password");
        if (username == null || password == null) {
            throw new BadRequestException("Username and password are required");
        }

        username = username.trim().toLowerCase();

        return userService.loginUser(username, password)
                .map(token -> {
                    JsonObject response = new JsonObject();
                    response.put("token", token);
                    return response;
                });
    }

    @POST
    @Path("/register")
    public Uni<JsonObject> registerUser(User user) {
        if (user.getUsername() != null) {
            user.setUsername(user.getUsername().trim().toLowerCase());
        }
        if (user.getEmail() != null) {
            user.setEmail(user.getEmail().trim().toLowerCase());
        }

        return userService.registerUser(user)
                .map(token -> {
                    JsonObject response = new JsonObject();
                    response.put("token", token);
                    return response;
                });
    }

    @Authenticated
    @GET
    @Path("/me")
    public Uni<User> fetchUserFromToken() {
        return identity.getDeferredIdentity()
                .chain(identity -> userService.fetchUser(Integer.parseInt(identity.getPrincipal().getName())))
                .chain(user -> userService.fetchUserBalance(user.getUserId())
                        .map(userBalance -> {
                            user.setUserBalance(userBalance);
                            return user;
                        }));
    }

    @Authenticated
    @POST
    @Path("/bonus/claim")
    public Uni<UserBalance> claimBonus() {
        return identity.getDeferredIdentity()
            .chain(identity -> {
                int userId = Integer.parseInt(identity.getPrincipal().getName());
                return userService.fetchUserBalance(userId)
                        .chain(userBalance -> {
                            int bonus = userBalance.getBonusBalance() != null ? userBalance.getBonusBalance() : 0;
                            if (bonus > 0) {
                                return userService.updateUserBalance(
                                        userId, 
                                        userBalance.getBalance() + bonus, 
                                        0
                                );
                            }
                            return Uni.createFrom().item(userBalance);
                        });
            });
    }


    

    @Authenticated
    @PATCH
    @Path("/me")
    public Uni<User> updateUser(User user) {
        return identity.getDeferredIdentity()
                .chain(identity -> userService.updateUser(Integer.parseInt(identity.getPrincipal().getName()), user));
    }



    @GET
    @Path("/search")
    public Uni<List<User>> searchUsers(@QueryParam("username") @DefaultValue("") String username) {
        return userService.searchUsers(username, false);
    }

    @GET
    @Path("/tables")
    public Uni<Collection<GameTable>> fetchTables() {
        return gameService.fetchTables();
    }


    @GET
    @Path("/maintenance")
    public Tuple2<LocalDateTime, LocalDateTime> fetchMaintenanceSchedule() {
        return gameService.getMaintenanceSchedule();
    }

    @Authenticated
    @GET
    @Path("/deposit")
    public Uni<List<Deposit>> fetchMyDeposits() {
        return identity.getDeferredIdentity()
                .chain(identity -> userService.fetchDeposits(Integer.parseInt(identity.getPrincipal().getName())));
    }

    @Authenticated
    @POST
    @Path("/deposit")
    public Uni<Deposit> createDepositRequest(Deposit deposit) {
        return identity.getDeferredIdentity()
                .chain(id -> {
                    Integer userId = Integer.parseInt(id.getPrincipal().getName());
                    return userService.createDepositRequest(userId, deposit);
                });
    }



    @Authenticated
    @GET
    @Path("/withdrawal")
    public Uni<List<Withdrawal>> fetchMyWithdrawals() {
        return identity.getDeferredIdentity()
                .chain(identity -> userService.fetchWithdrawals(Integer.parseInt(identity.getPrincipal().getName())));
    }

    @Authenticated
    @POST
    @Path("/withdrawal")
    public Uni<Withdrawal> createWithdrawal(Withdrawal withdrawal) {
        return identity.getDeferredIdentity()
                .chain(identity -> userService.createWithdrawal(Integer.parseInt(identity.getPrincipal().getName()), withdrawal));
    }

    @Authenticated
    @GET
    @Path("/outcome")
    public Uni<List<Outcome>> fetchUserOutcome() {
        return identity.getDeferredIdentity()
                .chain(identity -> userService.fetchOutcomes(
                        Integer.parseInt(identity.getPrincipal().getName()))
                );
    }

 
    @GET
    @Path("/block/{name}")
    public Uni<Response> fetchDataBlockByName(@PathParam("name") String dataBlockName) {
        return identity.getDeferredIdentity()
                .chain(() -> userService.fetchDataBlockByName(dataBlockName))
                .onItem().transform(result -> Response.ok(result).build())
                .onFailure().recoverWithItem(Response.status(Response.Status.INTERNAL_SERVER_ERROR).build());
    }

    @Authenticated  
    @POST
    @Path("/daily-bonus")
    public Uni<Response> claimDailyBonus() {
        return identity.getDeferredIdentity()
                .chain(identity -> {
                    Integer userId = Integer.parseInt(identity.getPrincipal().getName());

                    int min = 5000;
                    int max = 20000;
                    int step = 1000;
                    int randomMultiplier = new java.util.Random().nextInt((max - min) / step + 1);
                    int bonusAmount = min + randomMultiplier * step;

                    return userService.claimDailyBonus(userId, bonusAmount)
                            .map(userBalance -> {
                                io.vertx.core.json.JsonObject result = new io.vertx.core.json.JsonObject();
                                result.put("userBalance", userBalance);
                                result.put("bonusAmount", bonusAmount);
                                return Response.ok(result).build();
                            });
                })
                .onFailure().recoverWithItem(ex ->
                        Response.status(Response.Status.BAD_REQUEST)
                                .entity(ex.getMessage())
                                .build()
                );
    }

    @Authenticated
    @PATCH
    @Path("/avatar")
    public Uni<User> updateAvatar(JsonObject json) {
        String avatar = json.getString("avatar");
        String avatarBorder = json.getString("avatarBorder");

        return identity.getDeferredIdentity()
                .chain(id -> {
                    int userId = Integer.parseInt(id.getPrincipal().getName());
                    return userService.updateAvatar(userId, avatar, avatarBorder);
                });
    }
    @GET
    @Path("/tables/{id: [0-9]+}")
    public Uni<GameTable> fetchTableById(@PathParam("id") Long id) {
        return gameService.fetchTableById(id)
                .onItem().ifNull().failWith(() -> new NotFoundException("Table not found"));
    }
    
    @GET
    @Path("/tables/{secureId}")
    public Uni<GameTable> fetchTableBySecureId(@PathParam("secureId") String secureId) {
        return gameService.fetchTableBySecureId(secureId)
                .onItem().ifNull().failWith(() -> new NotFoundException("Table not found"));
    }


}
