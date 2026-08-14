import { describe, it, expect } from "vitest";
import { getSupabaseClient } from "@/lib/supabase/client";

describe("Supabase Integration", () => {
  it("initializes Supabase client when environment variables are set", () => {
    const client = getSupabaseClient();
    // Since NEXT_PUBLIC_SUPABASE_URL is configured in .env.local
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      expect(client).toBeDefined();
    } else {
      expect(client).toBeNull();
    }
  });
});
