# AeroGuard Cache Refresh (Full)

Bu projede yuzme suyu verisi **sadece full cache** dosyasindan okunur.

## Kullanilan Dosya

- `public/swimming-cache-full.json`

`services/swimmingService.ts` sadece bu dosyayi okur. `lite` fallback yoktur.

## Cache Yenileme

Haftalik cache yenileme komutu:

```bash
npm run refresh:swim-cache
```

Bu komut, `scripts/generateSwimmingCache.mjs` scriptini calistirir ve full cache dosyasini gunceller.

## Deploy Oncesi Kontrol

1. `npm run refresh:swim-cache`
2. `public/swimming-cache-full.json` dosyasinin olustugunu/guncellendigini kontrol et
3. `npm run build`
4. Deploy

## Not

Eger `public/swimming-cache-full.json` yoksa uygulama yuzme verisini gosteremez.
