package shared

//go:generate mockgen -destination=../../../tests/mocks/identification_service_mock.go -package=mocks meye-core/internal/domain/shared IdentificationService
type IdentificationService interface {
	GenerateID() string
}
