package user

import (
	"meye-core/internal/domain/event"
	"meye-core/internal/domain/shared"
)

type UserRole string

const (
	UserRoleAdmin  UserRole = "admin"
	UserRoleMaster UserRole = "master"
	UserRolePlayer UserRole = "player"
)

type User struct {
	id               string
	username         string
	hashedPassword   string
	role             UserRole
	uncommitedEvents []event.DomainEvent
}

func NewUser(username, password string, role UserRole, identificationService shared.IdentificationService, hashService HashService) (*User, error) {
	id := identificationService.GenerateID()

	hashedPassword, err := hashService.Hash(password)
	if err != nil {
		return nil, err
	}

	u := &User{
		id:             id,
		username:       username,
		role:           role,
		hashedPassword: hashedPassword,
	}

	u.uncommitedEvents = append(u.uncommitedEvents, newUserCreatedEvent(u))

	return u, nil
}

func (u *User) ID() string                             { return u.id }
func (u *User) Username() string                       { return u.username }
func (u *User) Role() UserRole                         { return u.role }
func (u *User) HashedPassword() string                 { return u.hashedPassword }
func (u *User) UncommittedEvents() []event.DomainEvent { return u.uncommitedEvents }

func (u *User) IsPlayer() bool {
	return u.role == UserRolePlayer
}

func CreateUserWithoutValidation(id, username, password string, role UserRole) *User {
	return &User{
		id:             id,
		username:       username,
		role:           role,
		hashedPassword: password,
	}
}

func (u *User) MustBePlayer() error {
	if u.role != UserRolePlayer {
		return ErrUserNotPlayer
	}

	return nil
}
