package dev.manestack.service;

import dev.manestack.dto.ChatMessageDTO;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jooq.DSLContext;
import static dev.manestack.jooq.generated.tables.PokerChatMessage.POKER_CHAT_MESSAGE;

import java.util.List;

@ApplicationScoped
public class ChatService {

    @Inject
    DSLContext dsl;

    public void saveMessage(ChatMessageDTO msg) {
        // Ensure tableId is null if 0 or not provided
        Long tableId = msg.getTableId();
        if (tableId == null || tableId == 0L) {
            tableId = null; // global chat or unknown table
        }

        dsl.insertInto(POKER_CHAT_MESSAGE)
           .set(POKER_CHAT_MESSAGE.TABLE_ID, tableId)
           .set(POKER_CHAT_MESSAGE.USER_ID, (int) msg.getUserId()) // cast primitive long to int
           .set(POKER_CHAT_MESSAGE.USERNAME, msg.getUsername())
           .set(POKER_CHAT_MESSAGE.MESSAGE, msg.getMessage())
           .set(POKER_CHAT_MESSAGE.CREATED_AT, msg.getCreatedAt())
           .execute();
    }

    public void deleteAllMessages() {
        dsl.deleteFrom(POKER_CHAT_MESSAGE)
           .where(POKER_CHAT_MESSAGE.TABLE_ID.isNull())
           .execute();
    }

    public List<ChatMessageDTO> getRecentMessages(int limit) {
        return dsl.selectFrom(POKER_CHAT_MESSAGE)
                .where(POKER_CHAT_MESSAGE.TABLE_ID.isNull())
                .orderBy(POKER_CHAT_MESSAGE.CREATED_AT.desc())
                .limit(limit)
                .fetchInto(ChatMessageDTO.class)
                .stream()
                .filter(m -> m.getCreatedAt() != null)
                .sorted((a, b) -> a.getCreatedAt().compareTo(b.getCreatedAt()))
                .toList();
    }

}
