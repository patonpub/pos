"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus } from "lucide-react"
import { NewSaleForm } from "@/components/new-sale-form"

export function FloatingSaleButton() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <>
      {/* Floating Action Button - Mobile Only */}
      <div className="fixed bottom-6 right-6 z-50 md:hidden">
        <Button
          size="lg"
          onClick={() => setIsDialogOpen(true)}
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow duration-200"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* Sale Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Process New Sale</DialogTitle>
            <DialogDescription>Add products and complete the sale transaction.</DialogDescription>
          </DialogHeader>
          <NewSaleForm 
            onClose={() => setIsDialogOpen(false)} 
            onSuccess={() => {
              setIsDialogOpen(false)
              // Optionally trigger a page refresh or data reload
              window.location.reload()
            }} 
          />
        </DialogContent>
      </Dialog>
    </>
  )
}