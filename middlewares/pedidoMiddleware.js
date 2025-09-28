const { body } = require("express-validator");

const pedidoValidation = () => {
    return [
        body("enderecoDestino.rua")
            .notEmpty().withMessage("O campo 'rua' é obrigatório")
            .isString().withMessage("Rua inválida"),

        body("enderecoDestino.numero")
            .notEmpty().withMessage("O campo 'número' é obrigatório")
            .isString().withMessage("Número inválido"),

        body("enderecoDestino.bairro")
            .notEmpty().withMessage("O campo 'bairro' é obrigatório")
            .isString().withMessage("Bairro inválido"),

        body("enderecoDestino.cidade")
            .notEmpty().withMessage("O campo 'cidade' é obrigatório")
            .isString().withMessage("Cidade inválida"),

        body("enderecoDestino.estado")
            .notEmpty().withMessage("O campo 'estado' é obrigatório")
            .isString().withMessage("Estado inválido"),

        body("enderecoDestino.cep")
            .notEmpty().withMessage("O campo 'cep' é obrigatório")
            .isPostalCode("BR").withMessage("CEP inválido"),

        body("enderecoDestino.coordX")
            .notEmpty().withMessage("A coordenada X é obrigatória")
            .isFloat().withMessage("Coordenada X inválida"),

        body("enderecoDestino.coordY")
            .notEmpty().withMessage("A coordenada Y é obrigatória")
            .isFloat().withMessage("Coordenada Y inválida"),

        body("pesoKg")
            .notEmpty().withMessage("O campo 'peso' é obrigatório")
            .isFloat({ min: 0.1, max: 50 }).withMessage("O campo 'peso' deve ser entre 0.1kg e 50kg"),

        body("status")
            .optional()
            .isIn(["pendente", "em_transporte", "entregue"])
            .withMessage("Status inválido"),

        body("prioridadeId")
            .notEmpty().withMessage("O campo 'prioridadeId' é obrigatório")
            .isMongoId().withMessage("ID de prioridade inválido"),
    ];
};

module.exports = { pedidoValidation };
