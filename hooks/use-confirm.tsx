"use client"

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ConfirmOptions {
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
}

export const useConfirm = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions>({})
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null)

  const confirm = (opts: ConfirmOptions = {}): Promise<boolean> => {
    setOptions({
      title: 'Are you sure?',
      description: 'This action cannot be undone.',
      confirmText: 'Continue',
      cancelText: 'Cancel',
      variant: 'default',
      ...opts,
    })
    setIsOpen(true)

    return new Promise((resolve) => {
      setResolvePromise(() => resolve)
    })
  }

  const handleConfirm = () => {
    resolvePromise?.(true)
    setIsOpen(false)
    setResolvePromise(null)
  }

  const handleCancel = () => {
    resolvePromise?.(false)
    setIsOpen(false)
    setResolvePromise(null)
  }

  const ConfirmDialog = () => (
    <AlertDialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleCancel()
    }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{options.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {options.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            {options.cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={options.variant === 'destructive' ? 'bg-destructive text-white hover:bg-destructive/90' : ''}
          >
            {options.confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  return { confirm, ConfirmDialog }
}