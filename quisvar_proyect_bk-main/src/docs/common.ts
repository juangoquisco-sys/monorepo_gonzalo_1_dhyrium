import 'swagger-jsdoc';

/**
 *   @swagger
 * components:
 *   parameters:
 *     limit:
 *       name: limit
 *       in: query
 *       description: Cantidad de registros
 *       schema:
 *         type: number
 *     offset:
 *       name: offset
 *       in: query
 *       description: Saltos de registros
 *       schema:
 *         type: number
 *     page:
 *       name: page
 *       in: query
 *       description: Numero de pagina
 *       schema:
 *         type: number
 *     initialDate:
 *       name: initialDate
 *       in: query
 *       description: Ingresar fecha inicial de reporte
 *       schema:
 *         type: string
 *     untilDate:
 *       name: untilDate
 *       in: query
 *       description: Ingresar fecha final de reporte
 *       schema:
 *         type: string
 *   responses:
 *     '200':
 *       description: Operación exitosa
 *       content:
 *         application/json:
 *           example:
 *             message: Operación exitosa
 *     '201':
 *       description: Recurso creado exitosamente
 *       content:
 *         application/json:
 *           example:
 *             message: Recurso creado exitosamente
 *     '204':
 *       description: No hay contenido
 *       content: {}
 *     '400':
 *       description: Solicitud incorrecta
 *       content:
 *         application/json:
 *           example:
 *             error: Solicitud incorrecta
 *     '404':
 *       description: Recurso no encontrado
 *       content:
 *         application/json:
 *           example:
 *             error: Recurso no encontrado
 *
 *  */
