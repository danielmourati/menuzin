import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { type PrintJob, fetchPendingJobs, markJobAsPrinted, clearPrintedJobs } from "@/lib/print-jobs.functions";
import { webBluetoothPrinter } from "@/lib/bluetooth-printer";
import { printQzTextTest, ensureQzConnected } from "@/lib/qz-tray"; // QZ Tray fallback for PC Server
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function usePrintQueue(isServer: boolean, localPrinterName?: string, useBluetooth?: boolean) {
  const queryClient = useQueryClient();

  const { data: queue = [], isLoading } = useQuery({
    queryKey: ["print-jobs"],
    queryFn: fetchPendingJobs,
  });

  const clearJobsMut = useMutation({
    mutationFn: clearPrintedJobs,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["print-jobs"] });
      toast.success("Fila de impressos limpa.");
    },
  });

  const processJob = useCallback(async (job: PrintJob) => {
    try {
      // Decode content (assumes text/plain payload for ESC/POS or simple string)
      const content = job.content;
      
      if (useBluetooth && webBluetoothPrinter.isConnected()) {
        const encoder = new TextEncoder();
        await webBluetoothPrinter.print(encoder.encode(content));
      } else if (localPrinterName) {
        await ensureQzConnected();
        // Here we just use the test method as an abstraction, but in reality we'd have a printReceipt method.
        // We simulate printing the payload:
        await printQzTextTest(localPrinterName, content, { feedLines: 3, cutType: "partial" });
      } else {
        throw new Error("Nenhuma impressora configurada.");
      }

      await markJobAsPrinted(job.id);
      queryClient.invalidateQueries({ queryKey: ["print-jobs"] });
    } catch (err) {
      console.error("Falha ao processar job", job.id, err);
      toast.error(`Falha ao imprimir pedido. Verifique a impressora.`);
    }
  }, [useBluetooth, localPrinterName, queryClient]);

  // Handle auto-printing for the server device
  useEffect(() => {
    if (!isServer) return;

    // Process jobs that are already in queue (e.g. on page load)
    queue.forEach(job => {
      if (job.status === "pending") {
        void processJob(job);
      }
    });

  }, [isServer, queue, processJob]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'print_jobs',
          filter: `status=eq.pending`,
        },
        (payload) => {
          const newJob = payload.new as PrintJob;
          queryClient.setQueryData<PrintJob[]>(["print-jobs"], (old = []) => [...old, newJob]);
          
          if (isServer) {
            void processJob(newJob);
          } else {
            toast.info("Novo pedido na fila de impressão.");
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isServer, processJob, queryClient]);

  return {
    queue,
    isLoading,
    clearJobs: () => clearJobsMut.mutate(),
    queueCount: queue.length
  };
}
