/* Built-in reference lists — index.html:653-659 and 688.

   A14. These are used ONLY when the reference directory is NOT READY: the
   load failed, or the SQL that introduced `reference_values` has not been
   applied. The original's own comment (index.html:681-687) is explicit about
   the distinction:

     «Soraqça hazırdır, amma aktiv dəyər yoxdursa — boş siyahı qaytarılır:
      əks halda Admin-in gizlətdiyi dəyərlər ehtiyat siyahı vasitəsilə
      formalara geri qayıdardı.»

   So a READY directory with no active values stays EMPTY. Do not use these
   lists to paper over that case — an Admin who hid every unit meant it, and
   restoring the defaults would undo an intentional configuration. */

/** `DEFAULT_UNITS` — index.html:688. */
export const DEFAULT_UNITS = [
  'ədəd', 'kq', 'metr', 'litr', 'm²', 'm³', 'ton', 'cüt', 'dəst', 'bağlama',
  'qutu', 'çanta', 'rulon',
]

/** `ITEM_CATEGORIES` — index.html:654-659. */
export const ITEM_CATEGORIES = [
  'Generatorlar', 'Nasoslar', 'Konteynerlər', 'Xüsusi texnika',
  'Kanselyariya və ofis ləvazimatları', 'İT və ofis texnikası', 'Mebel',
  'Əməyin mühafizəsi və təhlükəsizlik vasitələri', 'Filtrlər', 'Yağlar',
  'Laboratoriya malları', 'Alətlər və cihazlar',
  'Ehtiyat hissələri və fitinqlər', 'Tikinti materialları və sərfiyyat malları',
  'Məişət və təsərrüfat malları',
]
