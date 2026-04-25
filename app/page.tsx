import { redirect } from "next/navigation";
import { serverSupabase } from "@/lib/supabase-server";

export default async function Home() {
  const supabase = serverSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && user.email) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    if (profile) {
      redirect("/profile");
    }
    redirect("/consent");
  }

  redirect("/test");
}
