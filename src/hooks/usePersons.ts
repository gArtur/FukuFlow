import { useState, useEffect, useCallback } from 'react';
import type { Person } from '../types';
import { ApiClient } from '../lib/apiClient';

/**
 * Custom hook for managing persons (family members/owners).
 * Centralizes person CRUD operations and state management.
 */
export function usePersons() {
    const [persons, setPersons] = useState<Person[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchPersons = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await ApiClient.getPersons();
            setPersons(data);
        } catch (error) {
            console.error('Failed to fetch persons:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPersons();
    }, [fetchPersons]);

    const addPerson = useCallback(async (name: string): Promise<Person | undefined> => {
        try {
            const newPerson = await ApiClient.addPerson(name);
            setPersons(prev => [...prev, newPerson]);
            return newPerson;
        } catch (error) {
            console.error('Failed to add person:', error);
            return undefined;
        }
    }, []);

    const updatePerson = useCallback(async (
        id: string,
        updates: { name?: string; displayOrder?: number }
    ): Promise<boolean> => {
        try {
            await ApiClient.updatePerson(id, updates);
            setPersons(prev => prev.map(p =>
                p.id === id ? { ...p, ...updates } : p
            ));
            return true;
        } catch (error) {
            console.error('Failed to update person:', error);
            return false;
        }
    }, []);

    const deletePerson = useCallback(async (id: string): Promise<boolean> => {
        try {
            await ApiClient.deletePerson(id);
            setPersons(prev => prev.filter(p => p.id !== id));
            return true;
        } catch (error) {
            console.error('Failed to delete person:', error);
            return false;
        }
    }, []);

    const reorderPersons = useCallback(async (ids: string[]): Promise<boolean> => {
        // Optimistic update
        const previousPersons = persons;
        const orderedPersons = ids
            .map(id => persons.find(p => p.id === id))
            .filter((p): p is Person => p !== undefined)
            .map((p, index) => ({ ...p, displayOrder: index }));
        setPersons(orderedPersons);

        try {
            await ApiClient.reorderPersons(ids);
            return true;
        } catch (error) {
            console.error('Failed to reorder persons:', error);
            // Rollback on error
            setPersons(previousPersons);
            return false;
        }
    }, [persons]);

    const getPersonName = useCallback((ownerId: string): string => {
        const person = persons.find(p => p.id === ownerId);
        return person?.name || 'Unknown';
    }, [persons]);

    return {
        persons,
        isLoading,
        fetchPersons,
        addPerson,
        updatePerson,
        deletePerson,
        reorderPersons,
        getPersonName
    };
}

export default usePersons;
