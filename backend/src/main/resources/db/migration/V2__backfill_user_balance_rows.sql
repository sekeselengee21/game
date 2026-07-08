INSERT INTO poker_user_balance (user_id, balance, locked_amount, bonus_balance)
SELECT user_id, 0, 0, 0
FROM poker_user u
WHERE NOT EXISTS (
    SELECT 1
    FROM poker_user_balance b
    WHERE b.user_id = u.user_id
);
