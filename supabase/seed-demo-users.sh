#!/usr/bin/env bash
# Create the demo logins used by supabase/seed.sql.
#
# Development only. Writing to auth.users with SQL is not permitted on hosted Supabase,
# so this goes through the Auth Admin API with the service role key, which is the
# supported path. The key is read from .env.local and is never printed.
#
#   ./supabase/seed-demo-users.sh
#
# Idempotent: an email that already exists is skipped, so re-running is safe.
# Then apply the catalogue:  psql "$DATABASE_URL" -f supabase/seed.sql
set -euo pipefail

env_file="$(dirname "$0")/../.env.local"
url="$(sed -n 's/^NEXT_PUBLIC_SUPABASE_URL=//p' "$env_file" | head -1 | tr -d '"')"
key="$(sed -n 's/^SUPABASE_SERVICE_ROLE_KEY=//p' "$env_file" | head -1 | tr -d '"')"

if [ -z "$url" ] || [ -z "$key" ]; then
  echo "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in $env_file" >&2
  exit 1
fi

# Disposable logins for local testing only. Change them if this project is ever shared.
PASSWORD='Modesy#Demo2026'

users=(
  "admin@modesy.dev|Admin Modesy|customer"
  "seller@modesy.dev|Daniel Jones|seller"
  "buyer@modesy.dev|Jane Doe|customer"
  "buyer2@modesy.dev|Sam Rivera|customer"
)

headers=(
  -H "apikey: $key"
  -H "Authorization: Bearer $key"
  -H "Content-Type: application/json"
)

list_json="$(curl -sS "${headers[@]}" "$url/auth/v1/admin/users?page=1&per_page=1000")"

for entry in "${users[@]}"; do
  IFS='|' read -r email full_name role <<< "$entry"

  # This GoTrue build ignores the `data` key on the admin endpoints and only honours
  # `user_metadata`, so setting the metadata is a separate call from creating the user.
  meta=$(printf '{"user_metadata":{"full_name":"%s","role":"%s"}}' "$full_name" "$role")

  if printf '%s' "$list_json" | grep -q "\"email\":\"$email\""; then
    sid=$(printf '%s' "$list_json" | node -e "
      let raw = '';
      process.stdin.on('data', (c) => (raw += c)).on('end', () => {
        const user = JSON.parse(raw).users.find((u) => u.email === '$email');
        console.log(user.id);
      });")
    curl -sS -X PUT "${headers[@]}" -d "$meta" "$url/auth/v1/admin/users/$sid" > /dev/null
    echo "exists   $email (metadata synced)"
    continue
  fi

  # handle_new_user() (migration 005) creates the profiles row from this metadata and
  # clamps anything other than 'seller' to 'customer', so 'admin' below is ignored on
  # purpose: the admin role is granted by seed.sql, server-side.
  created=$(curl -sS -X POST "${headers[@]}" \
    -d "$(printf '{"email":"%s","password":"%s","email_confirm":true}' "$email" "$PASSWORD")" \
    "$url/auth/v1/admin/users")

  if ! printf '%s' "$created" | grep -q '"id"'; then
    echo "FAILED   $email" >&2
    exit 1
  fi

  curl -sS -X PUT "${headers[@]}" -d "$meta" \
    "$url/auth/v1/admin/users/$(printf '%s' "$created" | node -e "
      let raw = '';
      process.stdin.on('data', (c) => (raw += c)).on('end', () => console.log(JSON.parse(raw).id));")" > /dev/null
  echo "created  $email"
done

echo
echo "Next: psql \"\$DATABASE_URL\" -f supabase/seed.sql"
