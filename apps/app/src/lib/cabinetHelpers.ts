
import { CabinetType } from "@/types";

export const getCabinetTypeLabel = (type: CabinetType) => {
    switch (type) {
        case 'KITCHEN':
        return 'Szafka kuchenna';
        case 'WARDROBE':
        return 'Szafa ubraniowa';
        case 'BOOKSHELF':
        return 'Regał/Biblioteczka';
        case 'DRAWER':
        return 'Szafka z szufladami';
    }
};
