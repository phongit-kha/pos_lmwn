import { OrderScreen } from "@/components/pos/OrderScreen";

interface PageProps {
  params: Promise<{ tableNumber: string }>;
}

export default async function OrderPage({ params }: PageProps) {
  const { tableNumber } = await params;
  const tableNum = parseInt(tableNumber, 10);

  if (isNaN(tableNum)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Invalid table number</p>
      </div>
    );
  }

  return <OrderScreen tableNumber={tableNum} />;
}
