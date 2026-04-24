import { supabase } from '@/lib/supabase'

const DEFAULT_CATEGORIES = [
  { name: 'Salario',        type: 'income',  color: '#10b981', icon: 'briefcase'      },
  { name: 'Freelance',      type: 'income',  color: '#6366f1', icon: 'laptop'         },
  { name: 'Inversiones',    type: 'income',  color: '#f59e0b', icon: 'trending-up'    },
  { name: 'Otros ingresos', type: 'income',  color: '#3b82f6', icon: 'plus-circle'    },
  { name: 'Vivienda',       type: 'expense', color: '#ef4444', icon: 'home'           },
  { name: 'Alimentación',   type: 'expense', color: '#f59e0b', icon: 'shopping-cart'  },
  { name: 'Transporte',     type: 'expense', color: '#3b82f6', icon: 'car'            },
  { name: 'Salud',          type: 'expense', color: '#10b981', icon: 'heart'          },
  { name: 'Ocio',           type: 'expense', color: '#8b5cf6', icon: 'music'          },
  { name: 'Educación',      type: 'expense', color: '#06b6d4', icon: 'book'           },
  { name: 'Ropa',           type: 'expense', color: '#ec4899', icon: 'shirt'          },
  { name: 'Pareja',         type: 'expense', color: '#f43f5e', icon: 'heart'          },
  { name: 'Regalos',        type: 'expense', color: '#a855f7', icon: 'gift'           },
  { name: 'Otros gastos',   type: 'expense', color: '#64748b', icon: 'more-horizontal'},
]

export const profileService = {
  async ensureProfile(userId) {
    // Crear profile si no existe
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true })

    if (profileError) {
      console.error('Error creando profile:', profileError)
      return
    }

    // Sembrar categorías por defecto si el usuario no tiene ninguna
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', userId)
      .limit(1)

    if (!existing?.length) {
      const rows = DEFAULT_CATEGORIES.map((c) => ({
        ...c,
        user_id: userId,
        is_default: true,
      }))
      const { error: catError } = await supabase.from('categories').insert(rows)
      if (catError) console.error('Error sembrando categorías:', catError)
    }
  },
}
