# Database Setup

This application now uses MySQL instead of Supabase. Follow these steps to set up the database:

## Prerequisites

1. Docker and Docker Compose installed on your system
2. MySQL client (optional, for direct database access)

## Setup Instructions

### 1. Start MySQL with Docker

```bash
# Create and start MySQL container
docker run -d \
  --name mysql-mahjong \
  -e MYSQL_ROOT_PASSWORD=your_password \
  -e MYSQL_DATABASE=mahjong_score \
  -p 3306:3306 \
  mysql:8.0
```

### 2. Create Database Schema

```bash
# Copy the schema file into the container and execute it
docker cp database/schema.sql mysql-mahjong:/tmp/schema.sql
docker exec -i mysql-mahjong mysql -uroot -pyour_password < /tmp/schema.sql
```

Or if you have MySQL client installed locally:

```bash
mysql -h localhost -P 3306 -u root -pyour_password < database/schema.sql
```

### 3. Environment Configuration

Create a `.env` file in the project root with the following variables:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=mahjong_score
```

### 4. Start the Application

```bash
npm run dev
```

## Docker Compose Alternative

You can also use Docker Compose for easier setup. Create a `docker-compose.yml` file:

```yaml
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    container_name: mysql-mahjong
    environment:
      MYSQL_ROOT_PASSWORD: your_password
      MYSQL_DATABASE: mahjong_score
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./database/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    restart: unless-stopped

volumes:
  mysql_data:
```

Then run:

```bash
docker-compose up -d
```

## Database Schema

The database contains the following tables:

- `teams`: Team information (id, name, color)
- `players`: Player information (id, name, team_id)
- `game_results`: Game session information (id, game_date)
- `player_game_results`: Individual player results for each game (id, game_result_id, player_id, points, score, rank)

## Migration from Supabase

If you're migrating from Supabase, you'll need to export your existing data and import it into MySQL. The application structure remains the same, only the database backend has changed.