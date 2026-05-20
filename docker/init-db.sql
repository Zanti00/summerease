-- Create summerease database if it does not exist
SELECT 'CREATE DATABASE summerease'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'summerease')\gexec

-- Create NexusAuth database if it does not exist (case-sensitive)
SELECT 'CREATE DATABASE "NexusAuth"'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'NexusAuth')\gexec
