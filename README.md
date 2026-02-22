# Aplikacja dla księgowego – ewidencja klientów

Rozbudowana aplikacja webowa (HTML/CSS/JS) do prowadzenia ewidencji klientów biura rachunkowego.

## Najważniejsze funkcje

- dodawanie i edycja klienta,
- dane kontaktowe klienta (osoba kontaktowa, e-mail, telefon),
- status zaksięgowania w danym miesiącu,
- obsługa dokumentów i zgłoszeń (`UPL-1`, `VAT-R`, `ZUS`, `JPK`) + sygnalizacja braków,
- status wysyłki deklaracji VAT/JPK i ZUS,
- ewidencja środków trwałych,
- liczba dokumentów przyniesionych w miesiącu,
- typ rozliczenia (KPiR / Ryczałt / Pełna księgowość),
- opłata miesięczna i status płatności za obsługę,
- terminy dokumentów i płatności z oznaczaniem pozycji po terminie,
- notatki do klienta,
- wyszukiwanie po nazwie, kontakcie i notatkach,
- filtrowanie po miesiącu i statusie (`zaksięgowani`, `niezaksięgowani`, `braki`, `po terminie`, `nieopłaceni`, `niewysłane deklaracje`),
- sortowanie listy (miesiąc, nazwa, liczba dokumentów, opłata),
- panel statystyk (m.in. nieopłaceni, suma abonamentów, postęp księgowania),
- sekcja przypomnień o zaległych dokumentach, płatnościach i niewysłanych deklaracjach,
- akcje masowe: ustawienie bieżącego miesiąca, zbiorcze oznaczenie widocznych klientów jako zaksięgowani/opłaceni,
- szybkie szablony notatek i automatyczne oznaczenie kompletu dokumentów,
- generator raportu miesięcznego (z kopiowaniem do schowka),
- eksport/import JSON (kopia zapasowa),
- eksport CSV do analizy poza aplikacją,
- migracja starszych danych (`v1`/`v2`/`v3`/`v4`) do aktualnego formatu,
- trwały zapis danych w `localStorage`.

## Uruchomienie

W katalogu projektu:

```bash
python3 -m http.server 8000
```

Następnie wejdź na: <http://localhost:8000>
