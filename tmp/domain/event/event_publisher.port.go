package event

import "context"

//go:generate mockgen -destination=../../../tests/mocks/publisher_mock.go -package=mocks meye-core/internal/domain/event Publisher
type Publisher interface {
	// Publish publishes a batch of domain events
	Publish(ctx context.Context, events []DomainEvent) error
}
