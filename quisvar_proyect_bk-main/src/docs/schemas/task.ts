import 'swagger-jsdoc';
/**
 * @swagger
 *  /tasks/{id}:
 *    get:
 *      tags:
 *        - Tasks
 *      summary: Obtener una tarea por ID
 *      description: Devuelve los detalles de una tarea específica por ID.
 *      parameters:
 *        - in: path
 *          name: id
 *          required: true
 *          description: ID de la tarea
 *          schema:
 *            type: integer
 *      responses:
 *        '200':
 *          $ref: '../common.ts#/components/responses/200'
 *        '201':
 *          $ref: '#/components/responses/201'
 *        '400':
 *          $ref: '#/components/responses/400'
 *        '404':
 *          $ref: '#/components/responses/404'
 *      security:
 *        - bearerAuth: []
 */
