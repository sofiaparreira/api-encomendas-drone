import { body } from "express-validator"

export const droneValidation = () => {
    return [
        body("nome")
            .isString().withMessage("Nome inválido")
            .notEmpty().withMessage("O campo 'nome' é obrigatório")
            .isLength({ min: 2, max: 20 }).withMessage("O campo 'nome' deve ter entre 2 e 20 caracteres"),
        body("capacidadeMaxKg")
            .isNumeric().withMessage("Capacidade deve ser um número")
            .notEmpty().withMessage("O campo 'capacidade máxima' é obrigatório")
            .isFloat({ min: 0.5, max: 50 }).withMessage("O campo 'capacidade máxima' deve ser entre 0.5kg e 50kg"),

        body("alcanceMaxKm")
            .isNumeric().withMessage("Alcance máximo deve ser um número")
            .notEmpty().withMessage("O campo 'alcance máximo' é obrigatório")
            .isFloat({ min: 5, max: 100 }).withMessage("O campo 'alcance máximo' deve ser entre 5km e 100km"),
        
        body("porcentagemBateria")
            .isNumeric().withMessage("Porcentagem da bateria deve ser um número")
            .notEmpty().withMessage("O campo 'porcentagem da bateria' é obrigatório")
            .isInt({ min: 1, max: 100}).withMessage("O campo 'porcentagem da bateria' deve ser entre 1 e 100"),
        body("coordX")
            .notEmpty(),
        body("coordY")
            .notEmpty(),

        body("status")
            .optional() // para vim o valor default
            .isIn(['disponivel', 'carregando', 'entregando', 'retornando', 'manutencao', 'reservado'])
            .withMessage("Status inválido"),
        body("velocidadeKMH")
            .isNumeric().withMessage("Velocidade máxima deve ser um número")
            .notEmpty().withMessage("O campo 'velocidade máxima' é obrigatório")
            .isInt({min: 30, max: 100}).withMessage("O campo 'velocidade máxima' deve ser entre 30km/h e 100km/h"),

        body("tempoVooMax")
            .optional()

    ]
}