import type { Person } from '../types';

interface FamilyFilterProps {
    persons: Person[];
    selected: string; // 'all' or person ID
    onSelect: (id: string) => void;
}

export default function FamilyFilter({ persons, selected, onSelect }: FamilyFilterProps) {
    return (
        <div className="filter-tabs">
            <button
                className={`filter-tab ${selected === 'all' ? 'active' : ''}`}
                onClick={() => onSelect('all')}
            >
                All
            </button>
            {persons.map(person => (
                <button
                    key={person.id}
                    className={`filter-tab ${selected === person.id ? 'active' : ''}`}
                    onClick={() => onSelect(person.id)}
                >
                    {person.name}
                </button>
            ))}
        </div>
    );
}
