package user

import (
	"meye-core/internal/domain/event"
	"time"

	"github.com/google/uuid"
)

// Compile-time check to ensure UseCase implements the port interface
var _ event.DomainEvent = (*UserCreatedEvent)(nil)

type UserCreatedEvent struct {
	id         string
	userID     string
	role       UserRole
	createdAt  time.Time
	occurredAt time.Time
}

func (e UserCreatedEvent) ID() string                         { return e.id }
func (e UserCreatedEvent) Type() event.EventType              { return event.EventTypeUserCreated }
func (e UserCreatedEvent) AggregateID() string                { return e.userID }
func (e UserCreatedEvent) AggregateType() event.AggregateType { return event.AggregateTypeUser }
func (e UserCreatedEvent) CreatedAt() time.Time               { return e.createdAt }
func (e UserCreatedEvent) OccurredAt() time.Time              { return e.occurredAt }

func (e UserCreatedEvent) Role() UserRole { return e.role }

func (e UserCreatedEvent) GetSerializedData() map[string]interface{} {
	return map[string]interface{}{
		"role": e.role,
	}
}

func newUserCreatedEvent(u *User) UserCreatedEvent {
	return UserCreatedEvent{
		id:         uuid.NewString(),
		userID:     u.id,
		role:       u.role,
		createdAt:  time.Now(),
		occurredAt: time.Now(),
	}
}
