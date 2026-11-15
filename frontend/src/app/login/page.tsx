import AuthForm from "@/components/AuthForm";

export const metadata = { title: "Log in · Star Detective" };

export default function Page() {
  return (
    <main className="au-page">
      <AuthForm mode="login" />
    </main>
  );
}
