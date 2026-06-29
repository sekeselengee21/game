package dev.manestack.endpoint.rest;

import dev.manestack.service.UserService;
import io.smallrye.mutiny.Uni;
import io.vertx.core.json.JsonObject;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

@Path("/api/v1/jackpot")
public class JackpotEndpoint {

    @Inject
    UserService userService;

    @GET
    @Path("/current")
    @Produces(MediaType.APPLICATION_JSON)
    public Uni<JsonObject> getCurrentJackpot() {
        return userService.getCurrentJackpot()
                .map(amount -> {
                    JsonObject response = new JsonObject();
                    response.put("amount", amount != null ? amount : 0);
                    return response;
                });
    }
}
