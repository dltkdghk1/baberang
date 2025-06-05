UPDATE leftover
SET leftover_rate = leftover_rate + 10
WHERE leftover_date = '2025-05-07'
  AND student_pk BETWEEN 1 AND 301;

UPDATE leftover
SET leftover_rate = leftover_rate + 40
WHERE leftover_date = '2025-05-08'
  AND student_pk BETWEEN 1 AND 301;

UPDATE leftover
SET leftover_rate = leftover_rate + 15
WHERE leftover_date = '2025-05-12'
  AND student_pk BETWEEN 1 AND 301;
  
UPDATE leftover
SET leftover_rate = leftover_rate + 10
WHERE leftover_date = '2025-05-19'
  AND student_pk BETWEEN 1 AND 301;
  
UPDATE leftover
SET leftover_rate = leftover_rate - 20
WHERE leftover_date = '2025-03-07'
  AND student_pk BETWEEN 1 AND 301;
  
UPDATE leftover
SET leftover_rate = leftover_rate - 25
WHERE leftover_date = '2025-03-26'
  AND student_pk BETWEEN 1 AND 301;