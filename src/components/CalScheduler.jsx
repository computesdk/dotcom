import Cal, { getCalApi } from "@calcom/embed-react";
import { useEffect, useState } from "react";

export default function CalScheduler() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    (async function () {
      const cal = await getCalApi({"namespace":"talk-to-an-engineer"});
      cal("ui", {"hideEventTypeDetails":true,"layout":"month_view"});
    })();
  }, [])
  
  // Only render on client side to avoid SSR issues
  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="text-gray-500 dark:text-gray-400">Loading scheduler...</div>
      </div>
    );
  }
  
  return (
    <Cal 
      namespace="talk-to-an-engineer"
      calLink="team/computesdk/talk-to-an-engineer"
      style={{width:"100%",height:"100%",overflow:"scroll"}}
      config={{"layout":"month_view"}}
    />
  );
}
