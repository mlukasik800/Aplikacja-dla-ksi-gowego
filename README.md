# Aplikacja dla księgowego – ewidencja klientów

Rozbudowana aplikacja webowa (HTML/CSS/JS) do prowadzenia ewidencji klientów biura rachunkowego.

## Najważniejsze funkcje

- dodawanie i edycja klienta,
- status zaksięgowania w danym miesiącu,
- obsługa dokumentów i zgłoszeń (`UPL-1`, `VAT-R`, `ZUS`, `JPK`),
- sygnalizacja braków dokumentów,
- ewidencja środków trwałych,
- liczba dokumentów przyniesionych w miesiącu,
- termin dostarczenia dokumentów,
- notatki do klienta,
- wyszukiwanie po nazwie i notatkach,
- filtrowanie po miesiącu i statusie,
- panel statystyk (liczba klientów, zaksięgowani, braki dokumentów, liczba dokumentów),
- eksport/import JSON (kopia zapasowa),
- trwały zapis danych w `localStorage`.

## Uruchomienie

W katalogu projektu:

```bash
python3 -m http.server 8000
```

Następnie wejdź na: <http://localhost:8000>
