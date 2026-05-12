import type { Person } from '../types';

interface FamilyFilterProps {
    persons: Person[];
    selected: string; // 'all' or person ID
    onSelect: (id: string) => void;
}

export default function FamilyFilter({ persons, selected, onSelect }: FamilyFilterProps) {
    return (
        <div className="filter-tabs" data-testid="family-filter">
            <button
                className={`filter-tab ${selected === 'all' ? 'active' : ''}`}
                onClick={() => onSelect('all')}
                data-testid="filter-all"
            >
                All
            </button>
            {persons.map(person => (
                <button
                    key={person.id}
                    className={`filter-tab ${selected === person.id ? 'active' : ''}`}
                    onClick={() => onSelect(person.id)}
                    data-testid={`filter-person-${person.id}`}
                    data-person-name={person.name}
                >
                    {person.name}
                </button>
            ))}
        </div>
    );
}
