'use client'
import { Star } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function FavoriteButton({ pncpId, size = 'sm' }: { pncpId: string; size?: 'sm' | 'md' }) {
  const [isFav, setIsFav] = useState(false)

  useEffect(() => {
    const favs = JSON.parse(localStorage.getItem('favoritos') || '[]')
    setIsFav(favs.some((f: { id: string }) => f.id === pncpId))
  }, [pncpId])

  const toggle = () => {
    const favs = JSON.parse(localStorage.getItem('favoritos') || '[]')
    if (isFav) {
      const newFavs = favs.filter((f: { id: string }) => f.id !== pncpId)
      localStorage.setItem('favoritos', JSON.stringify(newFavs))
      setIsFav(false)
    } else {
      favs.push({ id: pncpId, addedAt: new Date().toISOString(), status: 'interessante' })
      localStorage.setItem('favoritos', JSON.stringify(favs))
      setIsFav(true)
    }
  }

  return (
    <button onClick={toggle} className={`p-1.5 rounded-lg transition-colors ${isFav ? 'text-yellow-500 bg-yellow-50' : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'}`} title={isFav ? 'Remover dos favoritos' : 'Favoritar'}>
      <Star className={size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} fill={isFav ? 'currentColor' : 'none'} />
    </button>
  )
}
