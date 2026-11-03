import { useState, useEffect, useMemo } from 'react';
import { CartContext } from './cartContextDef';

const STORAGE_KEY = 'platewise_student_cart';

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to save cart to localStorage', e);
    }
  }, [items]);

  const addToCart = (item, quantity = 1) => {
    setItems((prev) => {
      const isSurplus = Boolean(item.is_surplus);
      const existingIndex = prev.findIndex(
        (i) => i.menu_item_id === item.menu_item_id && Boolean(i.is_surplus) === isSurplus
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = updated[existingIndex].quantity + quantity;
        const maxStock = item.stock ?? Infinity;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: Math.min(newQty, maxStock),
        };
        return updated;
      }
      return [
        ...prev,
        {
          menu_item_id: item.menu_item_id,
          name: item.name,
          category: item.category,
          price: Number(item.price),
          original_price: item.original_price ? Number(item.original_price) : null,
          is_surplus: isSurplus,
          food_batch_id: item.food_batch_id || null,
          quantity: Math.min(quantity, item.stock ?? Infinity),
          stock: item.stock ?? null,
        },
      ];
    });
  };

  const updateQuantity = (menu_item_id, delta, is_surplus = false) => {
    setItems((prev) => {
      return prev
        .map((item) => {
          if (item.menu_item_id === menu_item_id && Boolean(item.is_surplus) === Boolean(is_surplus)) {
            const nextQty = item.quantity + delta;
            const maxStock = item.stock ?? Infinity;
            if (nextQty <= 0) return null;
            return {
              ...item,
              quantity: Math.min(nextQty, maxStock),
            };
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  const removeFromCart = (menu_item_id, is_surplus = false) => {
    setItems((prev) =>
      prev.filter(
        (i) => !(i.menu_item_id === menu_item_id && Boolean(i.is_surplus) === Boolean(is_surplus))
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const cartCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const cartSubtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [items]);

  const value = {
    items,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    cartCount,
    cartSubtotal,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
