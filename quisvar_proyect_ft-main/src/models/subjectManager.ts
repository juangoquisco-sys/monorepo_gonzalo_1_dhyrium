import { Subject } from 'rxjs';

class SubjectManager<T> {
  private subject = new Subject<T>();

  get getSubject() {
    return this.subject.asObservable();
  }

  set setSubject(value: T) {
    this.subject.next(value);
  }
}

export default SubjectManager;
