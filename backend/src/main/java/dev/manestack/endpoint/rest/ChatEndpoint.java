package dev.manestack.endpoint.rest;

import dev.manestack.dto.ChatMessageDTO;
import dev.manestack.service.ChatService;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import java.util.List;

@Path("/api/chat")
@Produces(MediaType.APPLICATION_JSON)
public class ChatEndpoint {

    @Inject
    ChatService chatService;

    @GET
    @Path("/messages")
    public List<ChatMessageDTO> getMessages(@QueryParam("limit") @DefaultValue("50") int limit) {
        return chatService.getRecentMessages(limit);
    }
}
