import { useEffect } from 'react'
import { useStore } from '@/store'

export function useGifts() {
  const people     = useStore((s) => s.giftPeople)
  const occasions  = useStore((s) => s.giftOccasions)
  const gifts      = useStore((s) => s.gifts)
  const loading    = useStore((s) => s.giftsLoading)
  const loaded     = useStore((s) => s.giftsLoaded)
  const fetchGiftData = useStore((s) => s.fetchGiftData)

  useEffect(() => {
    fetchGiftData()
  }, [])

  return {
    people,
    occasions,
    gifts,
    loading: loading && !loaded,
    addGiftPerson:      useStore((s) => s.addGiftPerson),
    updateGiftPerson:   useStore((s) => s.updateGiftPerson),
    removeGiftPerson:   useStore((s) => s.removeGiftPerson),
    addGiftOccasion:    useStore((s) => s.addGiftOccasion),
    updateGiftOccasion: useStore((s) => s.updateGiftOccasion),
    removeGiftOccasion: useStore((s) => s.removeGiftOccasion),
    createOccasionSavingsGoal: useStore((s) => s.createOccasionSavingsGoal),
    addGift:      useStore((s) => s.addGift),
    updateGift:   useStore((s) => s.updateGift),
    removeGift:   useStore((s) => s.removeGift),
    purchaseGift: useStore((s) => s.purchaseGift),
    receiveGift:  useStore((s) => s.receiveGift),
  }
}
