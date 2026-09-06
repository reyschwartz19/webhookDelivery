#!/bin/sh

echo "Waiting for the database to be ready..."
until npx prisma migrate deploy 2>/dev/null; do
    echo "Database is not ready yet. Retrying in 2 seconds..."
    sleep 2
done



echo "Starting the server..."
exec npm start