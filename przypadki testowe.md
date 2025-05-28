# Przypadki testowe - Aplikacja Real Time Music Map

## 1. ONBOARDING - SLAJDY WPROWADZAJĄCE

### TC001
**Tytuł: Wyświetlanie pierwszego slajdu wprowadzającego**
<br>**Środowisko: iOS/Android - Aplikacja Real Time Music Map**
<br>**Wersja: Demo: Alfa**
<br>**Warunek wstępny: Pierwsza instalacja aplikacji na urządzeniu. Aplikacja nie była wcześniej uruchamiana.**
<br>**Kroki reprodukcji:**
1. **Otworzenie aplikacji przez ikonę na ekranie głównym.**
2. **Sprawdzenie zawartości pierwszego slajdu.**
3. **Weryfikacja elementów graficznych i tekstowych.**


**Oczekiwany rezultat: Wyświetlenie pierwszego slajdu z opisem działania aplikacji, prawidłową grafiką i czytelnym tekstem.**
<br>**Rzeczywisty rezultat: [PLACEHOLDER - opisz co faktycznie się wydarzyło podczas testu]**
<br>**Status testu: [ZALICZONY / NIEZALICZONY]**
<br>**Warunki końcowe: Pierwszy slajd onboardingu jest widoczny. Użytkownik może przejść do kolejnego slajdu.**

### TC002
**Tytuł: Przechodzenie między slajdami onboardingu**
<br>**Środowisko: iOS/Android - Aplikacja Real Time Music Map**
<br>**Wersja: Demo: Alfa**
<br>**Warunek wstępny: Aplikacja otwarta, widoczny pierwszy slajd onboardingu.**
<br>**Kroki reprodukcji:**
1. **Przesunięcie slajdu gestem w prawo lub kliknięcie przycisku "Dalej".**
2. **Sprawdzenie wyświetlenia drugiego slajdu.**
3. **Powtórzenie czynności dla przejścia do trzeciego slajdu.**


**Oczekiwany rezultat: Płynne przechodzenie między wszystkimi trzema slajdami. Każdy slajd wyświetla się poprawnie.**
<br>**Rzeczywisty rezultat: [PLACEHOLDER - opisz co faktycznie się wydarzyło podczas testu]**
<br>**Status testu: [ZALICZONY / NIEZALICZONY]**
<br>**Warunki końcowe: Użytkownik znajduje się na trzecim slajdzie z przyciskiem logowania.**

### TC003
**Tytuł: Powrót do poprzednich slajdów onboardingu**
<br>**Środowisko: iOS/Android - Aplikacja Real Time Music Map**
<br>**Wersja: Demo: Alfa**
<br>**Warunek wstępny: Użytkownik znajduje się na drugim lub trzecim slajdzie onboardingu.**
<br>**Kroki reprodukcji:**
1. **Przesunięcie slajdu gestem w lewo lub kliknięcie przycisku "Wstecz".**
2. **Sprawdzenie wyświetlenia poprzedniego slajdu.**
3. **Weryfikacja możliwości nawigacji do pierwszego slajdu.**


**Oczekiwany rezultat: Możliwość powrotu do poprzednich slajdów. Zawartość slajdów wyświetla się poprawnie.**
<br>**Rzeczywisty rezultat: [PLACEHOLDER - opisz co faktycznie się wydarzyło podczas testu]**
<br>**Status testu: [ZALICZONY / NIEZALICZONY]**
<br>**Warunki końcowe: Użytkownik może swobodnie nawigować między slajdami.**

## 2. AUTORYZACJA SPOTIFY

### TC004
<br>**Tytuł: Poprawne logowanie przez konto Spotify**
<br>**Środowisko: iOS/Android - Aplikacja Real Time Music Map**
<br>**Wersja: Demo: Alfa**
<br>**Warunek wstępny: Użytkownik jest na trzecim slajdzie onboardingu. Posiada konto Spotify**
<br>**Kroki reprodukcji:**
1. **Kliknięcie przycisku "Zaloguj przez Spotify".**
2. **Wprowadzenie prawidłowego adresu e-mail Spotify.**
3. **Wprowadzenie prawidłowego hasła Spotify.**
4. **Kliknięcie przycisku "Zaloguj" w oknie Spotify.**
5. **Zatwierdzenie autoryzacji aplikacji.**


**Oczekiwany rezultat: Pomyślne zalogowanie i przekierowanie do ekranu głównego z mapą.**
<br>**Rzeczywisty rezultat: [PLACEHOLDER - opisz co faktycznie się wydarzyło podczas testu]**
<br>**Status testu: [ZALICZONY / NIEZALICZONY]**
<br>**Warunki końcowe: Użytkownik zalogowany. Widoczny ekran z mapą, hotspotami i obecnie odtwarzaną muzyką nad mapą**

### TC005
<br>**Tytuł: Logowanie przez Spotify z nieprawidłowymi danymi**
<br>**Środowisko: iOS/Android - Aplikacja Real Time Music Map**
<br>**Wersja: Demo: Alfa**
<br>**Warunek wstępny: Użytkownik na trzecim slajdzie onboardingu.**
<br>**Kroki reprodukcji:**
1. **Kliknięcie przycisku "Zaloguj przez Spotify".**
2. **Wprowadzenie nieprawidłowego adresu e-mail.**
3. **Wprowadzenie nieprawidłowego hasła.**
4. **Kliknięcie przycisku "Zaloguj".**


**Oczekiwany rezultat: Wyświetlenie komunikatu o błędnych danych logowania. Pozostanie na ekranie logowania Spotify.**
<br>**Rzeczywisty rezultat: [PLACEHOLDER - opisz co faktycznie się wydarzyło podczas testu]**
<br>**Status testu: [ZALICZONY / NIEZALICZONY]**
<br>**Warunki końcowe: Użytkownik nadal niezalogowany. Możliwość ponownej próby logowania.**

### TC006
<br>**Tytuł: Anulowanie procesu logowania przez Spotify**
<br>**Środowisko: iOS/Android - Aplikacja Real Time Music Map**
<br>**Wersja: Demo: Alfa**
<br>**Warunek wstępny: Otwarte okno logowania Spotify po kliknięciu przycisku logowania.**
<br>**Kroki reprodukcji:**
1. **Kliknięcie przycisku "Anuluj" lub "X" w oknie logowania.**


**Oczekiwany rezultat: Powrót do trzeciego slajdu onboardingu z przyciskiem logowania.**
<br>**Rzeczywisty rezultat: [PLACEHOLDER - opisz co faktycznie się wydarzyło podczas testu]**
<br>**Status testu: [ZALICZONY / NIEZALICZONY]**
<br>**Warunki końcowe: Użytkownik niezalogowany. Widoczny trzeci slajd onboardingu.**

### TC007
**Tytuł: Próba logowania bez połączenia internetowego**
<br>**Środowisko: iOS/Android - Aplikacja Real Time Music Map**
<br>**Wersja: Demo: Alfa**
<br>**Warunek wstępny: Brak aktywnego połączenia internetowego. Użytkownik na trzecim slajdzie onboardingu.**
<br>**Kroki reprodukcji:**
1. **Kliknięcie przycisku "Zaloguj przez Spotify".**


**Oczekiwany rezultat: Wyświetlenie komunikatu o braku połączenia internetowego.**
<br>**Rzeczywisty rezultat: [PLACEHOLDER - opisz co faktycznie się wydarzyło podczas testu]**
<br>**Status testu: [ZALICZONY / NIEZALICZONY]**
<br>**Warunki końcowe: Użytkownik niezalogowany. Widoczny komunikat o problemie z połączeniem.**

## 3. MAPA I HOTSPOTY

### TC008
**Tytuł: Wyświetlanie mapy po zalogowaniu**
<br>**Środowisko: iOS/Android - Aplikacja Real Time Music Map**
<br>**Wersja: Demo: Alfa**
<br>**Warunek wstępny: Użytkownik pomyślnie zalogowany przez Spotify.**
<br>**Kroki reprodukcji:**
1. **Sprawdzenie czy mapa się ładuje po zalogowaniu.**
2. **Weryfikacja widoczności hotspotów na mapie.**
3. **Sprawdzenie czy hotspoty mają numerki z liczbą słuchaczy.**


**Oczekiwany rezultat: Mapa ładuje się poprawnie z widocznymi hotspotami oznaczonymi numerkami.**
<br>**Rzeczywisty rezultat: [PLACEHOLDER - opisz co faktycznie się wydarzyło podczas testu]**
<br>**Status testu: [ZALICZONY / NIEZALICZONY]**
<br>**Warunki końcowe: Widoczna mapa z hotspotami. Użytkownik może interakcjonować z mapą.**

### TC009
**Tytuł: Wyświetlanie lokalizacji użytkownika na mapie**
<br>**Środowisko: iOS/Android - Aplikacja Real Time Music Map**
<br>**Wersja: Demo: Alfa**
<br>**Warunek wstępny: Użytkownik zalogowany. Uprawnienia do lokalizacji przyznane.**
<br>**Kroki reprodukcji:**
1. **Sprawdzenie czy na mapie widoczna jest aktualna lokalizacja użytkownika.**
2. **Weryfikacja dokładności pozycjonowania.**
3. **Sprawdzenie czy lokalizacja aktualizuje się przy przemieszczeniu.**


**Oczekiwany rezultat: Aktualna lokalizacja użytkownika jest poprawnie wyświetlona na mapie.**
<br>**Rzeczywisty rezultat: [PLACEHOLDER - opisz co faktycznie się wydarzyło podczas testu]**
<br>**Status testu: [ZALICZONY / NIEZALICZONY]**
<br>**Warunki końcowe: Użytkownik widzi swoją pozycję na mapie. Lokalizacja jest aktualna.**

### TC010
**Tytuł: Funkcja zoom mapy**
<br>**Środowisko: iOS/Android - Aplikacja Real Time Music Map**
<br>**Wersja: Demo: Alfa**
<br>**Warunek wstępny: Mapa załadowana i widoczna.**
<br>**Kroki reprodukcji:**
1. **Użycie gestu pinch-to-zoom do przybliżenia mapy.**
2. **Użycie gestu pinch-to-zoom do oddalenia mapy.**
3. **Sprawdzenie płynności animacji i responsywności.**


**Oczekiwany rezultat: Płynne przybliżanie i oddalanie mapy. Hotspoty skalują się odpowiednio.**
<br>**Rzeczywisty rezultat: [PLACEHOLDER - opisz co faktycznie się wydarzyło podczas testu]**
<br>**Status testu: [ZALICZONY / NIEZALICZONY]**
<br>**Warunki końcowe: Mapa w wybranym poziomie przybliżenia. Funkcja zoom działa poprawnie.**

### TC011
**Tytuł: Przesuwanie mapy**
<br>**Środowisko: iOS/Android - Aplikacja Real Time Music Map**
<br>**Wersja: Demo: Alfa**
<br>**Warunek wstępny: Mapa załadowana i widoczna.**
<br>**Kroki reprodukcji:**
1. **Przesunięcie mapy gestem w różnych kierunkach (góra, dół, lewo, prawo).**
2. **Sprawdzenie płynności przesuwania.**
3. **Weryfikacja czy hotspoty aktualizują się dla nowego obszaru.**


**Oczekiwany rezultat: Płynne przesuwanie mapy we wszystkich kierunkach. Hotspoty aktualizują się dla widocznego obszaru.**
<br>**Rzeczywisty rezultat: [PLACEHOLDER - opisz co faktycznie się wydarzyło podczas testu]**
<br>**Status testu: [ZALICZONY / NIEZALICZONY]**
<br>**Warunki końcowe: Mapa wyświetla nowy obszar z odpowiednimi hotspotami.**

## 4. GÓRNY PASEK - AKTUALNA MUZYKA

### TC012
**Tytuł: Wyświetlanie aktualnie słuchanej muzyki**
<br>**Środowisko: iOS/Android - Aplikacja Real Time Music Map**
<br>**Wersja: Demo: Alfa**
<br>**Warunek wstępny: Użytkownik jest zalogowany.**
<br>**Kroki reprodukcji:**
1. **Uruchomienie odtwarzania muzyki w aplikacji Spotify.**


**Oczekiwany rezultat: W górnym pasku wyświetla się tytuł utworu i nazwa wykonawcy aktualnie słuchanej muzyki.**
<br>**Rzeczywisty rezultat: [PLACEHOLDER - opisz co faktycznie się wydarzyło podczas testu]**
<br>**Status testu: [ZALICZONY / NIEZALICZONY]**
<br>**Warunki końcowe: Górny pasek pokazuje aktualne informacje o muzyce.**

### TC013
**Tytuł: Aktualizacja informacji o muzyce przy zmianie utworu**
<br>**Środowisko: iOS/Android - Aplikacja Real Time Music Map**
<br>**Wersja: Demo: Alfa**
<br>**Warunek wstępny: Użytkownik jest zalogowany Spotify odtwarza muzykę z zalogowanego konta.**
<br>**Kroki reprodukcji:**
1. **Zmiana utworu w aplikacji Spotify.**
2. **Powrót do aplikacji Real Time Music Map.**


**Oczekiwany rezultat: Górny pasek automatycznie aktualizuje informacje o nowym utworze.**
<br>**Rzeczywisty rezultat: [PLACEHOLDER - opisz co faktycznie się wydarzyło podczas testu]**
<br>**Status testu: [ZALICZONY / NIEZALICZONY]**
<br>**Warunki końcowe: Pasek wyświetla informacje o aktualnie odtwarzanym utworze.**

### TC014
**Tytuł: Wyświetlanie paska przy braku odtwarzanej muzyki**
<br>**Środowisko: iOS/Android - Aplikacja Real Time Music Map**
<br>**Wersja: Demo: Alfa**
<br>**Warunek wstępny: Użytkownik zalogowany. Spotify odtwarza muzykę.**
<br>**Kroki reprodukcji:**
1. **Zatrzymanie odtwarzania w aplikacji Spotify.**


**Oczekiwany rezultat: Górny pasek zmienia się na pusty.**
<br>**Rzeczywisty rezultat: [PLACEHOLDER - opisz co faktycznie się wydarzyło podczas testu]**
<br>**Status testu: [ZALICZONY / NIEZALICZONY]**
<br>**Warunki końcowe: Pasek obecnie słuchanej muzyki jest pusty.**

## 5. HOTSPOTY - LISTA UŻYTKOWNIKÓW

### TC015
**Tytuł: Otwieranie listy użytkowników z hotspotu**
<br>**Środowisko: iOS/Android - Aplikacja Real Time Music Map**
<br>**Wersja: Demo: Alfa**
<br>**Warunek wstępny: Użytkownik jest zalogowany do aplikacji. Na mapie istnieje przynajmniej jeden hotspot.**
<br>**Kroki reprodukcji:**
1. **Kliknięcie w hotspot.**


**Oczekiwany rezultat: Otwiera się panel z listą użytkowników słuchających muzyki w danej lokalizacji. Ilość użytkowników zgadza się z numerem na hotspocie.**
<br>**Rzeczywisty rezultat: [PLACEHOLDER - opisz co faktycznie się wydarzyło podczas testu]**
<br>**Status testu: [ZALICZONY / NIEZALICZONY]**
<br>**Warunki końcowe: Widoczna lista użytkowników z tej lokalizacji. Możliwość przeglądania listy.**

### TC016
**Tytuł: Zamykanie listy użytkowników**
<br>**Środowisko: iOS/Android - Aplikacja Real Time Music Map**
<br>**Wersja: Demo: Alfa**
<br>**Warunek wstępny: Lista użytkowników jest otwarta.**
<br>**Kroki reprodukcji:**
1. **Kliknięcie obszaru poza listą.**


**Oczekiwany rezultat: Lista użytkowników zamyka się. Powrót do normalnego widoku mapy.**
<br>**Rzeczywisty rezultat: [PLACEHOLDER - opisz co faktycznie się wydarzyło podczas testu]**
<br>**Status testu: [ZALICZONY / NIEZALICZONY]**
<br>**Warunki końcowe: Widoczna mapa bez otwartej listy użytkowników.**

## 6. UPRAWNIENIA I BEZPIECZEŃSTWO

### TC017
**Tytuł: Prośba o uprawnienia do lokalizacji przy pierwszym uruchomieniu**
<br>**Środowisko: iOS/Android - Aplikacja Real Time Music Map**
<br>**Wersja: Demo: Alfa**
<br>**Warunek wstępny: Pierwsza instalacja aplikacji. Brak przyznanych uprawnień do lokalizacji.**
<br>**Kroki reprodukcji:**
1. **Pierwsze uruchomienie aplikacji.**


**Oczekiwany rezultat: Aplikacja wyświetla systemową prośbę o dostęp do lokalizacji urządzenia.**
<br>**Rzeczywisty rezultat: [PLACEHOLDER - opisz co faktycznie się wydarzyło podczas testu]**
<br>**Status testu: [ZALICZONY / NIEZALICZONY]**
<br>**Warunki końcowe: Użytkownik ma możliwość przyznania lub odmowy uprawnień.**

### TC018
**Tytuł: Działanie aplikacji bez uprawnień do lokalizacji**
<br>**Środowisko: iOS/Android - Aplikacja Real Time Music Map**
<br>**Wersja: Demo: Alfa**
<br>**Warunek wstępny: Użytkownik nie uruchamiał wcześniej aplikacji.**
<br>**Kroki reprodukcji:**
1. **Odmówienie przyznania uprawnień do lokalizacji.**


**Oczekiwany rezultat: Aplikacja informuje o potrzebie uprawnień.**
<br>**Rzeczywisty rezultat: [PLACEHOLDER - opisz co faktycznie się wydarzyło podczas testu]**
<br>**Status testu: [ZALICZONY / NIEZALICZONY]**
<br>**Warunki końcowe: Aplikacja wyświetla odpowiedni komunikat.**

## 7. TESTY WYDAJNOŚCI I STABILNOŚCI

### TC019
**Tytuł: Długotrwałe używanie aplikacji**
<br>**Środowisko: iOS/Android - Aplikacja Real Time Music Map**
<br>**Wersja: Demo: Alfa**
<br>**Warunek wstępny: Aplikacja uruchomiona oraz użytkownik jest zalogowany.**
<br>**Kroki reprodukcji:**
1. **Używanie aplikacji przez 30 minut nieprzerwanie.**
2. **Regularne przesuwanie mapy, otwieranie hotspotów.**


**Oczekiwany rezultat: Stabilne działanie przez cały czas testowania. Rozsądne zużycie zasobów urządzenia.**
<br>**Rzeczywisty rezultat: [PLACEHOLDER - opisz co faktycznie się wydarzyło podczas testu]**
<br>**Status testu: [ZALICZONY / NIEZALICZONY]**
<br>**Warunki końcowe: Aplikacja nadal działa płynnie po długotrwałym użytkowaniu oraz zużyła nie wielkie ilości baterii.**

### TC020
**Tytuł: Przejście aplikacji do tła i powrót**
<br>**Środowisko: iOS/Android - Aplikacja Real Time Music Map**
<br>**Wersja: Demo: Alfa**
<br>**Warunek wstępny: Aplikacja aktywna z załadowaną mapą.**
<br>**Kroki reprodukcji:**
1. **Przejście do innej aplikacji (przycisk Home).**
2. **Pozostawienie aplikacji w tle na 5 minut.**
3. **Powrót do aplikacji Real Time Music Map.**


**Oczekiwany rezultat: Aplikacja wznawia się w tym samym stanie co przed przejściem do tła. Mapa i dane są aktualne.**
<br>**Rzeczywisty rezultat: [PLACEHOLDER - opisz co faktycznie się wydarzyło podczas testu]**
<br>**Status testu: [ZALICZONY / NIEZALICZONY]**
<br>**Warunki końcowe: Aplikacja działa normalnie po powrocie z tła.**

## 8. PRZYPADKI BRZEGOWE

### TC021
**Tytuł: Utrata połączenia internetowego podczas użytkowania**
<br>**Środowisko: iOS/Android - Aplikacja Real Time Music Map**
<br>**Wersja: Demo: Alfa**
<br>**Warunek wstępny: Aplikacja działa online z załadowaną mapą.**
<br>**Kroki reprodukcji:**
1. **Wyłączenie Wi-Fi i danych mobilnych podczas używania aplikacji.**


**Oczekiwany rezultat: Aplikacja wyświetla komunikat o braku połączenia. Graceful degradation funkcjonalności. Możliwość przeglądania hotspotów oraz przesuwania mapy z nieaktualnymi danymi**
<br>**Rzeczywisty rezultat: [PLACEHOLDER - opisz co faktycznie się wydarzyło podczas testu]**
<br>**Status testu: [ZALICZONY / NIEZALICZONY]**
**Warunki końcowe: Użytkownik informowany o problemie z połączeniem. Aplikacja działa z nieaktualnymi danymi**
