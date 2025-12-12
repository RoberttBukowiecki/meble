# Plan implementacji wykrywania kolizji

## 1. Logika wykrywania kolizji

- Wprowadzić funkcję, która iteruje po wszystkich częściach na scenie i sprawdza, czy nachodzą na siebie.
- Do detekcji kolizji użyjemy algorytmu sprawdzającego przecięcie się obiektów `Box3` z biblioteki Three.js. Każda część (reprezentowana jako `Mesh`) będzie miała swój `Box3`.
- Kolizja jest wykryta, gdy `Box3` jednej części przecina się z `Box3` innej części.
- Funkcja wykrywająca kolizje będzie uruchamiana po każdej modyfikacji części (zmiana rozmiaru, pozycji).

## 2. Wizualizacja kolizji w 3D

- Cześci, które kolidują, powinny zmienić kolor na czerwony.
- W komponencie `Part3D` zostanie dodana logika, która sprawdza, czy dana część jest na liście kolidujących części (przechowywanej w store).
- Jeśli część koliduje, jej materiał (`MeshStandardMaterial`) zostanie tymczasowo zmieniony na materiał w kolorze czerwonym (np. z `emissive` ustawionym na czerwony dla lepszej widoczności).
- Kiedy kolizja zostanie rozwiązana, materiał powinien wrócić do oryginalnego.
- Jesli kolidujące części są zgrupowane, cały ich grupowany obiekt powinien zmienić kolor na czerwony.

## 3. Interfejs użytkownika (UI) dla ostrzeżeń

- Stworzyć nowy komponent UI, który będzie wyświetlał ikonę ostrzeżenia (np. wykrzyknik w kółku), gdy w stanie aplikacji zostaną wykryte jakiekolwiek kolizje.
- Komponent ten będzie nasłuchiwał na zmiany w stanie kolizji w store Zustand.
- Po kliknięciu na ikonę ostrzeżenia, powinien pojawić się `Popover` lub `Dialog` (z biblioteki shadcn/ui), który wyświetli listę wszystkich wykrytych kolizji.
- Każdy element na liście powinien identyfikować kolidujące części (np. "Część A koliduje z Część B").

## 4. Zarządzanie stanem (Zustand)

- W `apps/app/src/lib/store.ts` rozszerzyć stan o nowe pole, np. `collisions: Collision[]`.
- Typ `Collision` będzie obiektem opisującym pojedynczą kolizję, np. `{ partId1: string, partId2: string }`.
- Stworzyć nową akcję w store, np. `detectCollisions()`, która będzie wykonywać logikę z punktu 1 i aktualizować stan `collisions`.
- Akcja `detectCollisions` będzie wywoływana wewnątrz innych akcji, które modyfikują części (np. `updatePart`, `addPart`).

## 5. Kroki implementacji

1.  **Rozszerzenie stanu Zustand:** Dodać `collisions` do `State` i `actions`.
2.  **Implementacja logiki detekcji:** Stworzyć funkcję `findCollisions(parts: Part[]): Collision[]`.
3.  **Integracja detekcji:** Wywoływać `findCollisions` w akcjach modyfikujących części i aktualizować stan.
4.  **Aktualizacja komponentu `Part3D`:** Dodać logikę zmieniającą materiał na podstawie stanu kolizji.
5.  **Stworzenie komponentu UI dla ostrzeżeń:** Dodać ikonę i `Popover` z listą kolizji.
6.  **Testy:** Przetestować ręcznie różne scenariusze kolizji.


## 6. Zwroc uwage na wybitny performance