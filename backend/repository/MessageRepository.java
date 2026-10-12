package com.dentaflow.backend.repository;

import com.dentaflow.backend.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {

    @Query("SELECT m FROM Message m WHERE m.sender.id = :userId OR m.receiver.id = :userId ORDER BY m.sentAt DESC")
    List<Message> findAllUserMessagesOrderBySentAtDesc(@Param("userId") Long userId);

    @Query("SELECT m FROM Message m WHERE (m.sender.id = :u1 AND m.receiver.id = :u2) OR (m.sender.id = :u2 AND m.receiver.id = :u1) ORDER BY m.sentAt ASC")
    List<Message> findConversationBetweenUsers(@Param("u1") Long user1Id, @Param("u2") Long user2Id);

    @Query("SELECT m FROM Message m WHERE m.sender.id = :senderId AND m.receiver.id = :receiverId AND UPPER(m.status) = 'SENT'")
    List<Message> findUnreadInConversation(@Param("senderId") Long senderId, @Param("receiverId") Long receiverId);

    List<Message> findByReceiverIdAndStatusIgnoreCase(Long receiverId, String status);

    long countByReceiverIdAndStatusIgnoreCase(Long receiverId, String status);

    @Query("SELECT DISTINCT CASE WHEN m.sender.id = :userId THEN m.receiver.id ELSE m.sender.id END FROM Message m WHERE m.sender.id = :userId OR m.receiver.id = :userId")
    List<Long> findConversationPartnerIds(@Param("userId") Long userId);
}
