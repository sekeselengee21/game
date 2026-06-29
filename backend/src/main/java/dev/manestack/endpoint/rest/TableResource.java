package dev.manestack.endpoint.rest;

import dev.manestack.service.GameService;
import dev.manestack.dto.HandHistoryDTO;
import io.smallrye.mutiny.Uni;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import java.util.List;

@Path("/tables")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class TableResource {

    @Inject
    GameService gameService;

    @GET
    @Path("/{tableId}/hand-history")
    public Uni<List<HandHistoryDTO>> getHandHistory(
            @PathParam("tableId") Long tableId,
            @QueryParam("limit") @DefaultValue("10") int limit,
            @QueryParam("offset") @DefaultValue("0") int offset
    ) {
        if (tableId == null || tableId <= 0) throw new BadRequestException("tableId must be positive");
        if (limit <= 0) limit = 10;
        if (offset < 0) offset = 0;

        return gameService.getHandHistory(tableId, limit, offset);
    }
}
