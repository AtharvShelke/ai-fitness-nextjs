import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect('/');
  }

  // Fetch user object to ensure valid ID
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      plans: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!user) {
    redirect('/');
  }

  // Next.js requires passing serialized JSON, so we cast data appropriately
  const plans = user.plans.map((p: any) => ({
    id: p.id,
    type: p.type,
    createdAt: p.createdAt.toISOString(),
    data: p.data,
    inputData: p.inputData
  }));

  const userMetrics = {
    height: user.height,
    weight: user.weight,
    age: user.age,
    gender: user.gender,
    goal: user.goal,
  };

  return <DashboardClient 
    plans={plans} 
    user={{ name: user.name || '', email: user.email }} 
    userMetrics={userMetrics}
  />;
}
