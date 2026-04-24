import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
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
            toast.error('Failed to load persons');
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
            toast.success('Person added successfully');
            return newPerson;
        } catch (error) {
            console.error('Failed to add person:', error);
            toast.error('Failed to add person');
            return undefined;
        }
    }, []);

    const updatePerson = useCallback(
        async (id: string, updates: { name?: string; displayOrder?: number }): Promise<boolean> => {
            try {
                await ApiClient.updatePerson(id, updates);
                setPersons(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)));
                toast.success('Person updated');
                return true;
            } catch (error) {
                console.error('Failed to update person:', error);
                toast.error('Failed to update person');
                return false;
            }
        },
        []
    );

    const deletePerson = useCallback(async (id: string): Promise<boolean> => {
        try {
            await ApiClient.deletePerson(id);
            setPersons(prev => prev.filter(p => p.id !== id));
            toast.success('Person deleted');
            return true;
        } catch (error) {
            console.error('Failed to delete person:', error);
            toast.error('Failed to delete person');
            return false;
        }
    }, []);

    const reorderPersons = useCallback(
        async (ids: string[]): Promise<boolean> => {
            // Optimistic update
            const previousPersons = persons;
            const orderedPersons = ids
                .map(id => persons.find(p => p.id === id))
                .filter((p): p is Person => p !== undefined)
                .map((p, index) => ({ ...p, displayOrder: index }));
            setPersons(orderedPersons);

            try {
                await ApiClient.reorderPersons(ids);
                toast.success('Persons reordered');
                return true;
            } catch (error) {
                console.error('Failed to reorder persons:', error);
                toast.error('Failed to reorder persons');
                // Rollback on error
                setPersons(previousPersons);
                return false;
            }
        },
        [persons]
    );

    const getPersonName = useCallback(
        (ownerId: string): string => {
            const person = persons.find(p => p.id === ownerId);
            return person?.name || 'Unknown';
        },
        [persons]
    );

    return {
        persons,
        isLoading,
        fetchPersons,
        addPerson,
        updatePerson,
        deletePerson,
        reorderPersons,
        getPersonName,
    };
}

export default usePersons;
